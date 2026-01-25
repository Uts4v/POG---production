import { motion } from "framer-motion";

interface TeaLeafIconProps {
  className?: string;
  animate?: boolean;
}

export const TeaLeafIcon = ({ className = "", animate = false }: TeaLeafIconProps) => {
  const content = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <path
        d="M12 2C7.5 2 4 6 4 11C4 16 7.5 20 12 22C16.5 20 20 16 20 11C20 6 16.5 2 12 2Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 2C7.5 2 4 6 4 11C4 16 7.5 20 12 22C16.5 20 20 16 20 11C20 6 16.5 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6V18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 9C9 9 10.5 10 12 10C13.5 10 15 9 15 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 13C8 13 10 14.5 12 14.5C14 14.5 16 13 16 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  if (animate) {
    return (
      <motion.div
        className={className}
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={className}>{content}</div>;
};
