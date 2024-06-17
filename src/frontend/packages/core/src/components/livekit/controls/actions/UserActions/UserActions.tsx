import { LocalParticipant, RemoteParticipant } from "livekit-client"
import { useRoomService } from "../../../../../services/livekit/room.services"
import { useAudioAllowed, useScreenSharingAllowed, useVideoAllowed } from "../../../utils/permissions"
import { Button, Decision, Modal, ModalSize, Popover, VariantType, useModal, useModals, useToastProvider } from "@openfun/cunningham-react"
import { MicIcon, MicDisabledIcon, CameraIcon, CameraDisabledIcon, ScreenShareIcon, ScreenShareStopIcon, ChatCloseIcon } from "@livekit/components-react"
import { useState, useRef, useEffect } from "react"
import { useIsMobile } from "../../../../../hooks/useIsMobile"
import { RemoveUserIcon, MoreIcon, TickIcon } from "../../../assets/icons"
import './style.css'
import { defineMessages, useIntl } from 'react-intl';


export interface UserActionInfo {
    participant: RemoteParticipant | LocalParticipant
}

const messages = defineMessages({
    error: {
        defaultMessage: 'An error occured',
        description: 'An error occured',
        id: 'components.room.error',
    },
    remove: {
        defaultMessage: 'Do you want to remove ',
        description: 'Remove user',
        id: 'components.room.remove',
    },
    warning: {
        defaultMessage: 'Warning',
        description: 'Warning',
        id: 'components.room.warning',
    },
    confirmation: {
        defaultMessage: 'Are you sure you want to remove ',
        description: 'Confirmation',
        id: 'components.room.confirmation',
    },
    joinMessage: {
        defaultMessage: ' wants to join the conference',
        description: 'Message when a participant wants to join the conference',
        id: 'components.rooms.participants.joinMessage',
    }
})

export const UserActions = (infos: UserActionInfo) => {
    const intl = useIntl()
    const roomService = useRoomService()

    const audio = useAudioAllowed(infos.participant.permissions)
    const video = useVideoAllowed(infos.participant.permissions)
    const screenSharing = useScreenSharingAllowed(infos.participant.permissions)

    const { toast } = useToastProvider()
    const localParticipant = infos.participant
    const handleError = () => {
        toast(intl.formatMessage(messages.error), VariantType.ERROR)
    }

    const audioMute = () => {
        const allowedSources = [...!audio ? ["MICROPHONE"] : [], ...video ? ["CAMERA"] : [], ...screenSharing ? ["SCREEN_SHARE", "SCREEN_SHARE_AUDIO"] : []]
        roomService.setAllowedSources(infos.participant, allowedSources).catch(() => {
            handleError()
        })
    }

    const videoMute = () => {
        const allowedSources = [...audio ? ["MICROPHONE"] : [], ...!video ? ["CAMERA"] : [], ...screenSharing ? ["SCREEN_SHARE", "SCREEN_SHARE_AUDIO"] : []]
        roomService.setAllowedSources(infos.participant, allowedSources).catch(() => {
            handleError()
        })
    }

    const screenSharingMute = () => {
        const allowedSources = [...audio ? ["MICROPHONE"] : [], ...video ? ["CAMERA"] : [], ...!screenSharing ? ["SCREEN_SHARE", "SCREEN_SHARE_AUDIO"] : []]
        roomService.setAllowedSources(infos.participant, allowedSources).catch(() => {
            handleError()
        })
    }

    const modals = useModals()

    const removeParticipant = () => {
        const confirmRemoval = async () => {
            await modals.deleteConfirmationModal({ children: intl.formatMessage(messages.remove) + `${infos.participant.name} ?` })
                .then((decision: Decision) => {
                    if (decision == "delete") {
                        roomService.remove(infos.participant).catch(() => handleError())
                    }
                })
        }
        confirmRemoval()
    }

    const [settingsOpened, setSettingsOpened] = useState(false)

    const switchPopover = () => {
        setSettingsOpened(!settingsOpened)
    }

    const closePopover = () => {
        setSettingsOpened(false)
    }

    const mobile = useIsMobile()

    const accept = () => {
        roomService.initParticipant(infos.participant).then(() => {
        }).catch(() => {
            handleError()
        })
    }

    const reject = () => {
        roomService.remove(infos.participant).then(() => {
        }).catch(() => {
            handleError()
        })
    }

    const kickModal = useModal()

    const parentRef = useRef(null)
    const actionDiv =

        <div className="ActionContainer" >
            <Button style={{ backgroundColor: "transparent" }} onClick={audioMute} icon={audio ? <MicIcon /> : <MicDisabledIcon />} />
            <Button style={{ backgroundColor: "transparent" }} onClick={videoMute} icon={video ? <CameraIcon /> : <CameraDisabledIcon />} />
            <Button style={{ backgroundColor: "transparent" }} onClick={screenSharingMute} icon={screenSharing ? <ScreenShareIcon /> : <ScreenShareStopIcon />} />
            {mobile && <Button style={{ backgroundColor: "transparent" }} onClick={removeParticipant} icon={<RemoveUserIcon />} />}
        </div>


    useEffect(() => {
        if (!infos.participant.permissions?.canSubscribe && JSON.parse(localParticipant.metadata || "{}").admin) {
            toast(infos.participant.name + intl.formatMessage(messages.joinMessage), VariantType.INFO)
        }
    }, [infos.participant])

    return (
        (infos.participant.permissions?.canSubscribe) ?
            <div ref={parentRef} style={{ justifyContent: "space-between", display: "flex", gap: "0.5em" }}>
                {!mobile && <Button style={{ backgroundColor: "transparent" }} onClick={removeParticipant} icon={<RemoveUserIcon />} />}
                {settingsOpened &&
                    <Popover parentRef={parentRef} onClickOutside={closePopover}>
                        {actionDiv}
                    </Popover>}
                <Modal {...kickModal} size={ModalSize.SMALL} title={intl.formatMessage(messages.warning)}>
                    {intl.formatMessage(messages.confirmation) + `${infos.participant.name} ?`}
                </Modal>
                <Button onClick={switchPopover} icon={<MoreIcon />} style={{ backgroundColor: "transparent" }} />
            </div>
            :
            <div className="JoinContainer" >
                <Button style={{ color: "#0DCE36", backgroundColor: "transparent" }} onClick={accept} icon={<TickIcon />} />
                <Button style={{ backgroundColor: "transparent" }} onClick={reject} icon={<ChatCloseIcon style={{ strokeWidth: "1.5", stroke: "red" }} />} />
            </div>

    )
}