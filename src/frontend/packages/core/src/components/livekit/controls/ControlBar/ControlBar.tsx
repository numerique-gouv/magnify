import { CameraDisabledIcon, CameraIcon, ChatIcon, LeaveIcon, MediaDeviceMenu, MicDisabledIcon, MicIcon, ScreenShareIcon, ScreenShareStopIcon, TrackToggleProps, UseChatToggleProps, useChatToggle, useDisconnectButton, useLocalParticipantPermissions, useRemoteParticipants, useTrackToggle } from "@livekit/components-react"
import { Button, ToastProps, VariantType, defaultTokens } from "@openfun/cunningham-react"
import { Track } from "livekit-client"
import { Card, DropButton } from "grommet"
import { MouseEventHandler } from "react"
import { useIsMobile, useIsSmallSize } from "../../../../hooks/useIsMobile"
import { Event, useEventHandler } from "../../../../services/livekit/events"
import { MoreIcon } from "../../assets/icons"
import { tokens } from "../../../../cunningham-tokens"
import { LayoutToggle } from "../actions/togglers/LayoutToggle/LayoutToggle"
import { HandRaiseToggle } from "../actions/togglers/HandRaiseToggle/HandRaiseToggle"
import { ParticipantLayoutToggle } from "../actions/togglers/ParticipantLayoutToggle/ParticipantLayoutToggle"
import { EncryptionToggle } from "../actions/togglers/EncryptionToggle/EncryptionToggle"
import { defineMessages, useIntl } from "react-intl"

const messages = defineMessages({
    cameraDown: {
        defaultMessage: 'A moderator stopped your camera',
        description: 'Camera down',
        id: 'components.room.moderation.cameraDown',
    },
    cameraUp: {
        defaultMessage: 'A moderator allowed your camera',
        description: 'Camera up',
        id: 'components.room.moderation.cameraUp',
    },
    micDown: {
        defaultMessage: 'A moderator stopped your microphone',
        description: 'Mic down',
        id: 'components.room.moderation.microphoneDown',
    },
    micUp: {
        defaultMessage: 'A moderator allowed your microphone',
        description: 'Mic up',
        id: 'components.room.moderation.microphoneUp',
    },
    screenDown: {
        defaultMessage: 'An admin stopped your screen sharing',
        description: 'Screen down',
        id: 'components.room.moderation.screenShareDown',
    },
    screenUp: {
        defaultMessage: 'An admin allowed your screen sharing',
        description: 'Screen up',
        id: 'components.room.moderation.screenShareUp',
    },
    joinMessage: {
        defaultMessage: ' joined the conference',
        description: 'Message when a participant wants to join the conference',
        id: 'components.rooms.participants.joinMessage',
    },
    leaveMessage: {
        defaultMessage: ' left the conference',
        description: 'Message when a participant wants to leave the conference',
        id: 'components.rooms.participants.leaveMessage',
    }
})

export const Leave = ({ ...props }) => {
    const { buttonProps } = useDisconnectButton(props)
    return (
        <Button onClick={buttonProps.onClick} iconPosition={"right"} style={{ backgroundColor: `${defaultTokens.theme.colors["danger-400"]}` }} icon={<LeaveIcon />} />
    )
}

export const ChatToggle = ({ ...props }: UseChatToggleProps) => {
    const { mergedProps } = useChatToggle(props)
    return (
        <Button onClick={mergedProps.onClick} style={mergedProps.style} icon={<ChatIcon />}></Button>
    )
}

export type ToggleSource = Exclude<
    Track.Source,
    Track.Source.ScreenShareAudio | Track.Source.Unknown
>;

interface MagnifyToggleProps<T extends ToggleSource> {
    props: TrackToggleProps<T>,
    enabledIcon: React.ReactNode,
    disabledIcon: React.ReactNode,
    clickable: boolean
}

export function TrackToggle<T extends ToggleSource>(props: MagnifyToggleProps<T>) {
    const { buttonProps, enabled } = useTrackToggle(props.props);
    const small = useIsSmallSize()
    return (
        <Button style={buttonProps.style} disabled={props.clickable} onClick={buttonProps.onClick as MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLAnchorElement>} icon={enabled ? props.enabledIcon : props.disabledIcon} iconPosition="right">
            {!small && props.props.children}
        </Button>
    );
}

interface ControlBarProps {
    videoControl?: boolean,
    audioControl?: boolean,
    screenSharingControl?: boolean
}

const defaultControlBarProps: ControlBarProps = {
    videoControl: true,
    audioControl: true,
    screenSharingControl: true
}

export const ControlBar = (props: ControlBarProps) => {
    const intl = useIntl();

    const barProps = { ...defaultControlBarProps, ...props }
    const localPermissions = useLocalParticipantPermissions()
    const handler = useEventHandler()

    const videoEvent = new Event(localPermissions, { duration: 3000 } as ToastProps, (p): boolean => {
        return p?.canPublishSources.includes(1) ?? true
    })

    videoEvent.onSwitch(true, false, { computeMessage: () => intl.formatMessage(messages.cameraDown), variant: VariantType.INFO })
    videoEvent.onSwitch(false, true, { computeMessage: () => intl.formatMessage(messages.cameraUp), variant: VariantType.SUCCESS })
    handler.watchState(videoEvent)

    const audioEvent = new Event(localPermissions, { duration: 3000 } as ToastProps, (p): boolean => {
        return p?.canPublishSources.includes(2) ?? true
    })

    audioEvent.onSwitch(true, false, { computeMessage: () => intl.formatMessage(messages.micDown), variant: VariantType.INFO })
    audioEvent.onSwitch(false, true, { computeMessage: () => intl.formatMessage(messages.micUp), variant: VariantType.SUCCESS })
    handler.watchState(audioEvent)

    const screenEvent = new Event(localPermissions, { duration: 3000 } as ToastProps, (p): boolean => {
        return p?.canPublishSources.includes(3) ?? true
    })

    screenEvent.onSwitch(true, false, { computeMessage: () => intl.formatMessage(messages.screenDown), variant: VariantType.INFO })
    screenEvent.onSwitch(false, true, { computeMessage: () => intl.formatMessage(messages.screenUp), variant: VariantType.SUCCESS })
    handler.watchState(screenEvent)



    const r = useRemoteParticipants()

    const joinLeaveEvent = new Event(r, { duration: 3000 } as ToastProps)
    joinLeaveEvent.onCheck((o, t) => o.length > t.length, {
        computeMessage: (o, t) => {
            const newParticpants = o.filter((x) => !t.includes(x))
            return `${newParticpants[0]?.name ?? ""}` + intl.formatMessage(messages.leaveMessage)
        }, variant: VariantType.INFO
    })

    joinLeaveEvent.onCheck((o, t) => (o.length < t.length) && o.length > 0, {
        computeMessage: (o, t) => {
            const newParticpants = t.filter((x) => !o.includes(x))
            return `${newParticpants[0]?.name ?? ""}` + intl.formatMessage(messages.joinMessage)
        }, variant: VariantType.INFO
    })
    handler.watchState(joinLeaveEvent)

    const mobile = useIsMobile()

    const mobileSelector =
        <div style={{ color: "white", backgroundColor: `${tokens.theme.colors["primary-400"]}`, flexDirection: "row", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LayoutToggle />
            <HandRaiseToggle />
            <EncryptionToggle />
        </div>

    return (
        <div style={{ padding: "1em", display: 'flex', alignItems: "center", justifyContent: "center", gap: "1em" }}>
            {!mobile &&
                <>
                    <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                        <HandRaiseToggle />
                    </Card>
                    <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                        <ParticipantLayoutToggle />
                    </Card>
                </>
            }

            <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                <TrackToggle props={{ source: Track.Source.Microphone }} clickable={!barProps.audioControl ?? false} enabledIcon={<MicIcon />} disabledIcon={<MicDisabledIcon />} />
                <MediaDeviceMenu style={{ backgroundColor: `${tokens.theme.colors["primary-400"]}` }} kind="audioinput" />
            </Card>

            <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                <TrackToggle props={{ source: Track.Source.Camera }} clickable={!barProps.videoControl ?? false} enabledIcon={<CameraIcon />} disabledIcon={<CameraDisabledIcon />} />
                <MediaDeviceMenu style={{ backgroundColor: `${tokens.theme.colors["primary-400"]}` }} kind="videoinput" />
            </Card>

            {!mobile &&
                <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                    <TrackToggle props={{ source: Track.Source.ScreenShare }} clickable={!barProps.screenSharingControl ?? false} enabledIcon={<ScreenShareStopIcon />} disabledIcon={<ScreenShareIcon />} />
                </Card>
            }

            {!mobile && localPermissions?.canPublishData &&
                <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                    <ChatToggle props={{}} />
                </Card>
            }

            {mobile &&
                <DropButton dropContent={mobileSelector} dropProps={{ justify: "center", alignContent: "center", alignSelf: "center", elevation: "none" }} margin={"none"} style={{ padding: "0.8em", display: "flex", justifyContent: "center", backgroundColor: `${tokens.theme.colors["primary-400"]}` }} dropAlign={{ top: "bottom" }} >
                    <MoreIcon />
                </DropButton>
            }

            {!mobile &&
                <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                    <LayoutToggle />
                </Card>

            }
            {!mobile &&
                <Card style={{ borderRadius: "0.6em", display: "flex", flexDirection: "row" }} className="bg-primary-400">
                    <EncryptionToggle />
                </Card>
            }
            <Leave />
        </div>
    )
}