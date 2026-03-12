import figma from "@figma/code-connect"
import { Button } from "./button"

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-29", {
  props: {
    variant: figma.enum("Variant", {
      Primary: "default",
      Secondary: "secondary",
      Ghost: "ghost",
      Outline: "outline",
      Success: "success",
      Danger: "destructive",
    }),
    size: figma.enum("Size", {
      SM: "sm",
      MD: "md",
      LG: "lg",
    }),
    loading: figma.boolean("Loading"),
    children: figma.string("Label"),
  },
  example: ({ variant, size, loading, children }) => (
    <Button variant={variant} size={size} loading={loading}>
      {children}
    </Button>
  ),
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-30", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button variant="secondary">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-31", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button variant="ghost">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-32", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button variant="outline">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-33", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button variant="success">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-34", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button variant="destructive">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-45", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button size="sm">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-47", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button size="md">{children}</Button>,
})

figma.connect(Button, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-49", {
  props: { children: figma.string("Label") },
  example: ({ children }) => <Button size="lg">{children}</Button>,
})
