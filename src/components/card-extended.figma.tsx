import figma from "@figma/code-connect"
import { CardExtended, CardHeaderExtended, CardContent } from "./card-extended"

figma.connect(CardExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-84", {
  props: {
    variant: figma.enum("Variant", {
      Default: "default",
      Hover: "hover",
      Interactive: "interactive",
    }),
  },
  example: ({ variant }) => (
    <CardExtended variant={variant}>
      <CardHeaderExtended title="Card Title" subtitle="Optional subtitle" />
      <CardContent>Card content goes here.</CardContent>
    </CardExtended>
  ),
})

figma.connect(CardExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-92", {
  props: {},
  example: () => (
    <CardExtended variant="hover">
      <CardHeaderExtended title="Hover Card" />
      <CardContent>Lifts on hover.</CardContent>
    </CardExtended>
  ),
})

figma.connect(CardExtended, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-96", {
  props: {},
  example: () => (
    <CardExtended variant="interactive">
      <CardHeaderExtended title="Interactive Card" />
      <CardContent>Left accent border with hover lift.</CardContent>
    </CardExtended>
  ),
})
