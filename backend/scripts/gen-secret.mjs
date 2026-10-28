// JWT_SECRET 생성 — .env 에 붙여넣으세요.
import { randomBytes } from "node:crypto";
console.log(`JWT_SECRET="${randomBytes(48).toString("base64url")}"`);
