/**
 * ErrorMessage (client component)
 * - Simple styled container for errors.
 */
export default function ErrorMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="rounded border border-red-800 bg-red-900/40 p-3 text-red-200 text-sm">{children}</div>;
}
