import { createNextBase } from "@archont561/tools/configs/next";
import { createMDX } from "fumadocs-mdx/next";

export default createMDX()({
  ...createNextBase(),
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["*.e2b.app"],
});
