import { checkWorkspaceVersions } from "../../maintenance/structure.ts";

export function assertWorkspaceVersions(root: string): void {
  const issues = checkWorkspaceVersions(root);
  if (issues.length) throw new Error(`Workspace version drift:\n- ${issues.join("\n- ")}`);
}
