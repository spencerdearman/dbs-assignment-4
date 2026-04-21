export const clerkAppearance = {
  variables: {
    borderRadius: "14px",
    colorBackground: "#ffffff",
    colorDanger: "#111111",
    colorInputBackground: "#f7f7f7",
    colorInputText: "#111111",
    colorNeutral: "#e6e6e6",
    colorPrimary: "#111111",
    colorText: "#111111",
    colorTextSecondary: "#7a7a7a",
    fontFamily: "var(--font-space-grotesk), sans-serif",
  },
  elements: {
    card: "shadow-none border border-[var(--border)] bg-white rounded-[28px]",
    headerTitle: "text-[2rem] font-semibold tracking-tight text-[var(--ink)]",
    headerSubtitle: "text-sm leading-6 text-[var(--ink-soft)]",
    socialButtonsBlockButton:
      "border border-[var(--border)] bg-white text-[var(--ink)] shadow-none hover:bg-[var(--surface-strong)]",
    socialButtonsBlockButtonText: "text-base font-medium",
    dividerLine: "bg-[var(--border)]",
    dividerText: "text-[var(--ink-soft)]",
    formButtonPrimary:
      "bg-[var(--ink)] text-white shadow-none hover:bg-[#222222]",
    formFieldInput:
      "border border-[var(--border)] bg-[var(--surface-strong)] shadow-none focus:border-[var(--ink)]",
    formFieldLabel: "text-sm font-medium text-[var(--ink)]",
    footerActionLink: "text-[var(--ink)] hover:text-[var(--ink)]",
    footerActionText: "text-[var(--ink-soft)]",
    identityPreviewText: "text-[var(--ink-soft)]",
    formFieldAction: "text-[var(--ink-soft)] hover:text-[var(--ink)]",
    formFieldActionLink: "text-[var(--ink)]",
    formResendCodeLink: "text-[var(--ink)]",
  },
} as const;
