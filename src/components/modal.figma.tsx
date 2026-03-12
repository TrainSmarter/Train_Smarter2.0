import figma from "@figma/code-connect"
import { Modal, ConfirmDialog } from "./modal"
import { Button } from "./ui/button"

figma.connect(Modal, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-179", {
  props: {
    title: figma.string("Title"),
    description: figma.string("Description"),
  },
  example: ({ title, description }) => (
    <Modal open title={title} description={description} size="sm" footer={<Button>Confirm</Button>}>
      Modal content goes here.
    </Modal>
  ),
})

figma.connect(Modal, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-182", {
  props: {
    title: figma.string("Title"),
    description: figma.string("Description"),
  },
  example: ({ title, description }) => (
    <Modal open title={title} description={description} size="md" footer={<Button>Confirm</Button>}>
      Modal content goes here.
    </Modal>
  ),
})

figma.connect(Modal, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-185", {
  props: {
    title: figma.string("Title"),
    description: figma.string("Description"),
  },
  example: ({ title, description }) => (
    <Modal open title={title} description={description} size="lg" footer={<Button>Confirm</Button>}>
      Modal content goes here.
    </Modal>
  ),
})

figma.connect(Modal, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-188", {
  props: {
    title: figma.string("Title"),
    description: figma.string("Description"),
  },
  example: ({ title, description }) => (
    <Modal open title={title} description={description} size="xl" footer={<Button>Confirm</Button>}>
      Modal content goes here.
    </Modal>
  ),
})

figma.connect(ConfirmDialog, "https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA?node-id=6-188", {
  props: {
    title: figma.string("Title"),
    message: figma.string("Message"),
    variant: figma.enum("Variant", {
      Primary: "primary",
      Danger: "danger",
    }),
  },
  example: ({ title, message, variant }) => (
    <ConfirmDialog open title={title} message={message} variant={variant} onConfirm={() => {}} onCancel={() => {}} />
  ),
})
