import figma from "@figma/code-connect"
import { Badge } from "./badge"

figma.connect(Badge, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-73", {
  props: {
    variant: figma.enum("Variant", {
      Primary: "primary",
      Success: "success",
      Warning: "warning",
      Error: "error",
      Info: "info",
      Gray: "gray",
      Default: "default",
    }),
    size: figma.enum("Size", {
      SM: "sm",
      MD: "md",
    }),
    children: figma.string("Label"),
  },
  example: ({ variant, size, children }) => (
    <Badge variant={variant} size={size}>{children}</Badge>
  ),
})

figma.connect(Badge, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-65", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Badge variant="success">{children}</Badge>,
})

figma.connect(Badge, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-67", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Badge variant="warning">{children}</Badge>,
})

figma.connect(Badge, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-69", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Badge variant="error">{children}</Badge>,
})

figma.connect(Badge, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-71", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Badge variant="info">{children}</Badge>,
})
