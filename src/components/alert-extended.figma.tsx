import figma from "@figma/code-connect"
import { AlertExtended } from "./alert-extended"

figma.connect(AlertExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-104", {
  props: {
    variant: figma.enum("Variant", {
      Success: "success",
      Warning: "warning",
      Error: "error",
      Info: "info",
    }),
    title: figma.string("Title"),
  },
  example: ({ variant, title }) => (
    <AlertExtended variant={variant} title={title}>
      Alert message goes here.
    </AlertExtended>
  ),
})

figma.connect(AlertExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-108", {
  props: { title: figma.string("Title") },
  example: ({ title }) => (
    <AlertExtended variant="warning" title={title}>
      Warning message goes here.
    </AlertExtended>
  ),
})

figma.connect(AlertExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-112", {
  props: { title: figma.string("Title") },
  example: ({ title }) => (
    <AlertExtended variant="error" title={title}>
      Error message goes here.
    </AlertExtended>
  ),
})

figma.connect(AlertExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-116", {
  props: { title: figma.string("Title") },
  example: ({ title }) => (
    <AlertExtended variant="info" title={title}>
      Info message goes here.
    </AlertExtended>
  ),
})
