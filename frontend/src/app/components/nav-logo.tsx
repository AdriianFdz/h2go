import Image from "next/image";

export const NavLogo = () => (
  <div className="flex items-center space-x-3 p-4">
    <Image
      src="/logo.svg"
      alt="H2GO Logo"
      width={150}
      height={150}
    />
    <div>
      <h1 className="text-5xl font-black">H2GO</h1>
      <p className="text-s text-muted">
        The triple <span className="font-bold">&apos;T&apos;</span> solution
      </p>
    </div>
  </div>
);
