import { LoaderIcon } from "./icons/loader";

export function LoaderPage() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <LoaderIcon animateOnHover={false} size={40} />
    </div>
  );
}
