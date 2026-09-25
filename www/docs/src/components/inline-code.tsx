// typeset styles inline code (`:not(pre) > code`); this is the hook for anything beyond that
export const InlineCode = (props: React.ComponentProps<'code'>) => (
  <code {...props} />
)
