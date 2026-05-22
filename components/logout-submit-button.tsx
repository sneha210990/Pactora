'use client';

export function LogoutSubmitButton() {
  return (
    <button
      type="submit"
      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
    >
      Log out
    </button>
  );
}
