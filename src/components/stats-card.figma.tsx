import figma from "@figma/code-connect"
import { StatsCard } from "./stats-card"
import { TrendingUp } from "lucide-react"

figma.connect(StatsCard, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-122", {
  props: {
    color: figma.enum("Color", {
      Blue: "blue",
      Green: "green",
      Purple: "purple",
      Orange: "orange",
      Red: "red",
    }),
    title: figma.string("Title"),
    value: figma.string("Value"),
  },
  example: ({ color, title, value }) => (
    <StatsCard
      color={color}
      title={title}
      value={value}
      icon={<TrendingUp className="h-5 w-5" />}
      trend={{ value: 12, direction: "up" }}
    />
  ),
})

figma.connect(StatsCard, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-127", {
  props: { title: figma.string("Title"), value: figma.string("Value") },
  example: ({ title, value }) => (
    <StatsCard color="purple" title={title} value={value} icon={<TrendingUp className="h-5 w-5" />} />
  ),
})

figma.connect(StatsCard, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-132", {
  props: { title: figma.string("Title"), value: figma.string("Value") },
  example: ({ title, value }) => (
    <StatsCard color="green" title={title} value={value} icon={<TrendingUp className="h-5 w-5" />} trend={{ value: 8, direction: "up" }} />
  ),
})

figma.connect(StatsCard, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-137", {
  props: { title: figma.string("Title"), value: figma.string("Value") },
  example: ({ title, value }) => (
    <StatsCard color="orange" title={title} value={value} icon={<TrendingUp className="h-5 w-5" />} trend={{ value: 3, direction: "neutral" }} />
  ),
})

figma.connect(StatsCard, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-142", {
  props: { title: figma.string("Title"), value: figma.string("Value") },
  example: ({ title, value }) => (
    <StatsCard color="blue" title={title} value={value} icon={<TrendingUp className="h-5 w-5" />} />
  ),
})
