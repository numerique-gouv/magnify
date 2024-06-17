import { MicDisabledIcon, MicIcon, useRemoteParticipants } from "@livekit/components-react"
import { useRoomService } from "../../../../../services/livekit/room.services"
import React from "react"
import { Button, Decision, useModals } from "@openfun/cunningham-react"
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
    affectAll: {
        defaultMessage: 'This action will affect all users',
        description: 'The message to display when there is no one',
        id: 'components.rooms.participants.affectAll',
    },
    allMicDown: {
        defaultMessage: 'Stop all microphones',
        description: 'The message to display when there is no one',
        id: 'components.rooms.participants.allMicDown',
    },
    allMicUp: {
        defaultMessage: 'Allow to talk',
        description: 'The message to display when there is no one',
        id: 'components.rooms.participants.allMicUp',
    }
})

export const BulkActions = () => {
    const intl = useIntl()
    const roomService = useRoomService()
    const participants = useRemoteParticipants()
    const [allVideoMuted, setallVideoMuted] = React.useState<boolean>(false)
    const [allAudioMuted, setAllAudioMuted] = React.useState<boolean>(false)
    const [allScreenMuted, setallScreenMuted] = React.useState<boolean>(false)
    const modals = useModals()

    const confirmBulk = async (): Promise<boolean> => {
        return await modals.confirmationModal({ children: intl.formatMessage(messages.affectAll) })
            .then((decision: Decision) => {
                return decision == "yes" ? true : false
            }).catch(() => false)
    }

    const tAudio = () => {
        confirmBulk().then((choice) => {
            if (choice == true) {
                const res = participants.map((p) => {
                    return roomService.describe(p).then((permissions) => {
                        const index = permissions.canPublishSources.indexOf("MICROPHONE")
                        if (allAudioMuted) {
                            index === -1 && permissions.canPublishSources.push("MICROPHONE")
                        } else {
                            index !== -1 && permissions.canPublishSources.splice(index,1)
                        }
                        return roomService.setAllowedSources(p, permissions.canPublishSources).then(() => true).catch(() => false)
                    })
                })
                Promise.all(res).then(() => {setAllAudioMuted(!allAudioMuted)});
                
            }
        })
    }

    return (
        <div style={{ justifyContent: "center", display: "flex", gap: "0.5em" }}>
            <Button style={{ backgroundColor: "transparent" }} onClick={tAudio} icon={!allAudioMuted ? <MicIcon /> : <MicDisabledIcon  />} >{!allAudioMuted ? "Couper tous les micros" : "Autoriser à parler"}</Button>
        </div>
    )
}