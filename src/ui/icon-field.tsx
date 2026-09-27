import { cn } from "@/utils/cn";
import type { Icon } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface IconFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: Icon;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

// -- Component ----------------------------------------------------------------

const IconField: React.FC<IconFieldProps> = ({
  icon: FieldIcon,
  trailing,
  wrapperClassName,
  className,
  onKeyDown,
  ref,
  type = "text",
  ...inputProps
}) => (
  <div className={cn("relative flex items-center", wrapperClassName)}>
    <FieldIcon aria-hidden="true" className="absolute left-2.5 size-4 text-composer-text-muted pointer-events-none" />
    <input
      ref={ref}
      type={type}
      spellCheck={false}
      autoComplete="off"
      {...inputProps}
      onKeyDown={(event) => {
        event.stopPropagation();
        onKeyDown?.(event);
      }}
      className={cn(
        "peer w-full h-8 pl-8 pr-3 text-sm rounded-lg bg-composer-input border border-composer-border text-composer-text transition-colors",
        "hover:border-composer-border-hover focus:outline-none focus:border-composer-accent",
        "placeholder:text-composer-text-muted cursor-text select-text",
        className,
      )}
    />
    {trailing && (
      <span className="absolute right-2 flex pointer-events-none peer-[:not(:placeholder-shown)]:hidden">
        {trailing}
      </span>
    )}
  </div>
);

// -- Exports ------------------------------------------------------------------

export { IconField };
