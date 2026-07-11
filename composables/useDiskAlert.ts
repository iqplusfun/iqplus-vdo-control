export type DiskLevel = "ok" | "warning" | "alert"

interface RoomDiskStatus {
    freeGb: number
    level: DiskLevel
}

const LEVEL_RANK: Record<DiskLevel, number> = {
    ok: 0,
    warning: 1,
    alert: 2,
}

export function useDiskAlert() {
    const roomStatus = useState<Record<string, RoomDiskStatus>>(
        "diskAlertRoomStatus",
        () => ({})
    )

    function setRoomDisk(roomId: string, status: RoomDiskStatus) {
        roomStatus.value = { ...roomStatus.value, [roomId]: status }
    }

    function clearRoom(roomId: string) {
        const next = { ...roomStatus.value }
        delete next[roomId]
        roomStatus.value = next
    }

    const worstLevel = computed<DiskLevel>(() => {
        let worst: DiskLevel = "ok"
        for (const status of Object.values(roomStatus.value)) {
            if (LEVEL_RANK[status.level] > LEVEL_RANK[worst]) {
                worst = status.level
            }
        }
        return worst
    })

    return { setRoomDisk, clearRoom, worstLevel }
}
