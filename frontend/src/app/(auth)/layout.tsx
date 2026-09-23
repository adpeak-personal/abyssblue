export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grad-deep relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden px-4 py-10">
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-15" viewBox="0 0 800 160" preserveAspectRatio="none" aria-hidden>
        <path d="M0 80 Q100 40 200 80 T400 80 T600 80 T800 80 V160 H0Z" fill="white" />
        <path d="M0 110 Q100 80 200 110 T400 110 T600 110 T800 110 V160 H0Z" fill="white" />
      </svg>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
