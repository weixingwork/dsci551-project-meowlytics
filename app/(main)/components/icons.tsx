import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11.95 20.2c-1.6-1.3-7.45-5.54-7.45-10A4.2 4.2 0 0 1 8.7 6c1.4 0 2.77.69 3.6 1.82A4.53 4.53 0 0 1 15.9 6a4.2 4.2 0 0 1 4.1 4.2c0 4.46-5.85 8.7-7.45 10-.17.14-.43.14-.6 0Z" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 5.2 6.4v5.1c0 4.3 2.8 7.4 6.8 9 4-1.6 6.8-4.7 6.8-9V6.4L12 3.5Z" />
      <path d="m9.6 12.1 1.6 1.6 3.4-3.4" />
    </IconBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V6" />
      <path d="m8.8 9.2 3.2-3.2 3.2 3.2" />
      <path d="M5 17.8h14" />
      <rect x="4" y="17.8" width="16" height="3.2" rx="1.6" />
    </IconBase>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 8.4h15a1.8 1.8 0 0 1 1.8 1.8v7a1.8 1.8 0 0 1-1.8 1.8h-15a1.8 1.8 0 0 1-1.8-1.8v-7a1.8 1.8 0 0 1 1.8-1.8Z" />
      <circle cx="12" cy="13" r="3.3" />
      <path d="M8 8.4 9.5 6h5L16 8.4" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 19.5h15" />
      <path d="M7.2 17v-4" />
      <path d="M12 17V9.5" />
      <path d="M16.8 17v-6.7" />
    </IconBase>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.2 3.6 19h16.8L12 4.2Z" />
      <path d="M12 9.2v4.4" />
      <circle cx="12" cy="16.6" r=".6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.8 12s3.3-6 9.2-6 9.2 6 9.2 6-3.3 6-9.2 6-9.2-6-9.2-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </IconBase>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M9.7 6.6A9.9 9.9 0 0 1 12 6c5.9 0 9.2 6 9.2 6a16.7 16.7 0 0 1-3.3 4.1" />
      <path d="M14.2 14.3a2.8 2.8 0 0 1-3.9-3.9" />
      <path d="M6.4 9A16.6 16.6 0 0 0 2.8 12s3.3 6 9.2 6c.9 0 1.7-.1 2.5-.3" />
    </IconBase>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1Z" />
    </IconBase>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12.2V6a1.5 1.5 0 0 1 1.5-1.5h6.2a2 2 0 0 1 1.4.6l5.3 5.3a2 2 0 0 1 0 2.8l-5.7 5.7a2 2 0 0 1-2.8 0L5.1 13.6a2 2 0 0 1-.6-1.4Z" />
      <circle cx="9" cy="9" r="1.1" />
    </IconBase>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4" width="14" height="16" rx="1.4" />
      <path d="M9 8h.01M12 8h.01M15 8h.01M9 11h.01M12 11h.01M15 11h.01M11 20v-4h2v4" />
    </IconBase>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4.5" width="14" height="15" rx="1.6" />
      <path d="M8.5 9h7M8.5 12h7M8.5 15h4.8" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.8 7h14.4" />
      <path d="M9.2 7V5.4a.9.9 0 0 1 .9-.9h3.8a.9.9 0 0 1 .9.9V7" />
      <path d="m7.4 7 .8 11.1a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L16.6 7" />
      <path d="M10.2 10.2v5.7M13.8 10.2v5.7" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12.4 4.2 4.2L19 6.8" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.7l3.1 1.9" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.2 5.2h10.3a1.5 1.5 0 0 1 1.5 1.5v12.1H7.7a1.5 1.5 0 0 1-1.5-1.5V5.2Z" />
      <path d="M6.2 5.2v12.1a1.5 1.5 0 0 0 1.5 1.5" />
      <path d="M10 8.7h5.5M10 11.8h5.5" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3.5 1.7 4.6L18 9.8l-4.3 1.7L12 16l-1.7-4.5L6 9.8l4.3-1.7L12 3.5Z" />
      <path d="m18.5 3.5.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
    </IconBase>
  );
}

export function CompareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v18" />
      <path d="M5 7l3-3 3 3" />
      <path d="M8 4v8" />
      <path d="M19 17l-3 3-3-3" />
      <path d="M16 12v8" />
    </IconBase>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.4 3.8h5.2" />
      <path d="M10.2 3.8v5.3l-4.4 7.2a2 2 0 0 0 1.7 3h9a2 2 0 0 0 1.7-3l-4.4-7.2V3.8" />
      <path d="M8.4 13.6h7.2" />
    </IconBase>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2H18.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15.2 4.8a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L8.4 19.6l-4.2 1 1-4.2L15.2 4.8Z" />
      <path d="m14 6 4 4" />
    </IconBase>
  );
}
