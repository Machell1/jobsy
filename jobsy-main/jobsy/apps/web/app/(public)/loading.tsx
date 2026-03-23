export default function PublicLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        <p className="mt-4 text-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}
