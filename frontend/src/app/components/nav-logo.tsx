import Image from "next/image";

export const NavLogo = ({ className }: { className?: string }) => (
  <div
    className={`flex items-center space-x-4 py-3 ${className ?? "px-3 w-64 shrink-0"}`}
  >
    <div className="relative flex items-center justify-center">
      <Image
        src="/logo.svg"
        alt="H2GO Logo"
        width={64}
        height={64}
      />
    </div>
    <div className="flex flex-col">
      <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">
        <span className="text-accent">H2</span>GO
      </h1>
      <p className="text-sm text-foreground mt-0.5">
        The triple <span className="font-bold text-accent">&apos;T&apos;</span>{" "}
        solution
      </p>
    </div>
  </div>
);
