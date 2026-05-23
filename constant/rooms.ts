import type { Room } from "~/types/room"

const rooms: Room[] = [
    {
        roomId: "green",
        roomName: "ห้องเขียว",
        roomShortName: "เขียว",
        preferredSceneCollection: "Green_room",
        preferredCameraInputName: "Green_room_webcam_front",
        preferredInputNameList: ["Green_room_webcam_front", "ipad", "Green_room_mic"],
        obsWebsocketUrl: "ws://192.168.1.10:4444",
    },
    {
        roomId: "chaiklang",
        roomName: "ห้องชายกลาง",
        roomShortName: "ชายกลาง",
        preferredSceneCollection: "Chaiklang_room",
        preferredCameraInputName: "Chaiklang_room_cam",
        preferredInputNameList: ["Chaiklang_room_cam", "Chaiklang_ipad_or_tablet"],
        obsWebsocketUrl: "ws://192.168.1.10:4445",
    },
]

export default rooms
