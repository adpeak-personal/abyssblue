// 주기적인 뒷정리.
//
// 지금까지는 `npm run uploads:gc` 를 사람이 직접 돌려야 했다. 아무도 안 돌리면
// 글에 안 쓰인 이미지가 S3 에 영원히 쌓인다 — 돈이 새는 쪽이라 자동으로 돈다.
//
// 끄려면 MAINTENANCE_ENABLED=false, 주기는 MAINTENANCE_INTERVAL_HOURS 로 바꾼다.
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { getStorage, toKey } from "../lib/storage.js";
import { deleteUploadRecords, findOrphans } from "../repositories/uploads.js";
import { purgeExpired } from "../repositories/phone.js";
import { purgeOld as purgeOldNotifications } from "../repositories/notifications.js";
import { releaseExpiredSuspensions } from "../repositories/members.js";

/** 글을 쓰다 만 사람의 이미지를 지우면 안 되므로 유예를 둔다 */
const ORPHAN_GRACE_HOURS = Number(process.env.UPLOADS_GC_GRACE_HOURS ?? 24);
const INTERVAL_HOURS = Number(process.env.MAINTENANCE_INTERVAL_HOURS ?? 6);
/** 서버가 막 떴을 때 바로 돌리지 않는다 — 기동 중 부하를 피한다 */
const FIRST_RUN_DELAY_MS = 60_000;

export interface SweepResult {
  orphans: number;
  orphanBytes: number;
  notifications: number;
  verifications: number;
  released: number;
}

/**
 * 한 바퀴 돈다.
 *
 * 스크립트(`npm run uploads:gc`)와 같은 저장소 함수를 쓴다 — 청소 규칙이 둘로 갈리지 않게.
 */
export async function sweep(): Promise<SweepResult> {
  const storage = getStorage();

  const orphans = await findOrphans(ORPHAN_GRACE_HOURS);
  let orphanBytes = 0;

  if (orphans.length > 0) {
    const keys = orphans.flatMap((o) => o.paths.map(toKey));
    await storage.remove(keys);
    // 파일을 지운 뒤에 기록을 지운다 — 중간에 멈춰도 다음 번에 다시 잡힌다
    await deleteUploadRecords(orphans.map((o) => o.id));
    orphanBytes = orphans.reduce((sum, o) => sum + o.bytes, 0);
  }

  return {
    orphans: orphans.length,
    orphanBytes,
    notifications: await purgeOldNotifications(),
    verifications: await purgeExpired(),
    released: await releaseExpiredSuspensions(),
  };
}

const plugin: FastifyPluginAsync = async (app) => {
  if (process.env.MAINTENANCE_ENABLED === "false") {
    app.log.info("뒷정리 작업이 꺼져 있습니다 (MAINTENANCE_ENABLED=false)");
    return;
  }

  const run = async () => {
    try {
      const r = await sweep();
      // 할 일이 없었으면 로그를 남기지 않는다 — 6시간마다 빈 줄이 쌓일 이유가 없다
      if (r.orphans || r.notifications || r.verifications || r.released) {
        app.log.info(
          { ...r, orphanKB: Math.round(r.orphanBytes / 1024) },
          "뒷정리 완료",
        );
      }
    } catch (err) {
      app.log.error({ err }, "뒷정리 실패");
    }
  };

  const first = setTimeout(() => void run(), FIRST_RUN_DELAY_MS);
  const repeat = setInterval(() => void run(), INTERVAL_HOURS * 60 * 60 * 1000);
  // 서버가 내려갈 때 타이머가 프로세스를 붙잡지 않게
  first.unref();
  repeat.unref();

  app.addHook("onClose", async () => {
    clearTimeout(first);
    clearInterval(repeat);
  });

  app.log.info(
    `뒷정리 작업 등록 — ${INTERVAL_HOURS}시간마다 (고아 이미지 유예 ${ORPHAN_GRACE_HOURS}시간)`,
  );
};

export const maintenancePlugin = fp(plugin, { name: "maintenance" });
