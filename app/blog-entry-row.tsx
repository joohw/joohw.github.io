type BlogEntryRowProps = {
  label: string;
  heading: string;
  onSelect: () => void;
};

export function BlogEntryRow({ label, heading, onSelect }: BlogEntryRowProps) {
  return (
    <button
      type="button"
      className="grid min-h-32 w-full grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 border border-foreground/20 bg-background/90 px-4 py-4 text-left hover:border-foreground/40 hover:bg-background focus-visible:outline-offset-4 sm:min-h-40 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4 sm:px-6"
      onClick={onSelect}
    >
      <span className="truncate text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-base font-light tracking-tight sm:text-lg">{heading}</span>
    </button>
  );
}
