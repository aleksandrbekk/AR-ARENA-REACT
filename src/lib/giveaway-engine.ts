import type { Ticket } from '../types'

// Participant info stored in draw results
export interface DrawParticipant {
    ticket_number: number
    username: string
    avatar?: string
    telegram_id: string
}

export interface DrawResults {
    seed: number
    tour1: {
        participants: DrawParticipant[]
    }
    tour2: {
        finalists: DrawParticipant[]
    }
    semifinal: {
        spins: { ticket: number; hits: number }[]
        eliminated: { ticket_number: number; username: string; place: number }[]
        finalists3: DrawParticipant[]
    }
    final: {
        turn_order: number[]
        turns: { turn: number; player: number; result: 'bull' | 'bear' }[]
    }
    winners: { place: number; ticket_number: number; username: string; telegram_id: string }[]
}

// ==================== HELPERS ====================
const hashUUID = (uuid: string): number => {
    let hash = 0
    for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash)
}

const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
}

const shuffleWithSeed = <T,>(array: T[], seed: number): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

// ==================== ENGINE ====================
export const generateDrawResults = async (tickets: Ticket[], giveawayId: string): Promise<DrawResults> => {
    const seed = hashUUID(giveawayId)

    // --- TOUR 1: QUALIFICATION (Unlimited -> 20) ---
    const shuffled1 = shuffleWithSeed(tickets, seed)
    const tour1Winners = shuffled1.slice(0, 20)

    // --- TOUR 2: ELIMINATION (20 -> 5) ---
    const indices = Array.from({ length: tour1Winners.length }, (_, i) => i)
    const shuffledIndices = shuffleWithSeed(indices, seed + 100)
    const selectedIndices = shuffledIndices.slice(0, 5) // Indices of the 5 winners within the 20
    const tour2Finalists = selectedIndices.map(idx => tour1Winners[idx])

    // --- SEMIFINAL: TRAFFIC LIGHT (5 -> 3) ---
    // Logic: 3 hits = eliminated. Last 3 standing (or based on elimination order) win.
    const hitCounts: Record<number, number> = {}
    tour2Finalists.forEach(t => hitCounts[t.ticket_number] = 0)
    const spins: { ticket: number; hits: number }[] = []
    const eliminated: number[] = []
    let spinSeed = seed + 200

    // We loop until 2 players are eliminated (leaving 3)
    while (eliminated.length < 2) {
        // Only pick from non-eliminated players
        const available = Object.keys(hitCounts)
            .map(k => parseInt(k))
            .filter(tNum => hitCounts[tNum] < 3)

        if (available.length === 0) break // Should not happen if logic is correct

        // Spin roulette
        const winnerTicket = available[Math.floor(seededRandom(spinSeed++) * available.length)]
        hitCounts[winnerTicket]++
        spins.push({ ticket: winnerTicket, hits: hitCounts[winnerTicket] })

        if (hitCounts[winnerTicket] === 3) {
            eliminated.push(winnerTicket)
        }
    }

    const finalists3 = tour2Finalists.filter(t => !eliminated.includes(t.ticket_number))

    // --- FINAL: BULLS & BEARS (3 -> Places 1, 2, 3) ---
    const turnOrder = shuffleWithSeed([0, 1, 2], seed + 300)
    // Indices 0,1,2 referring to finalists3 array
    const playerScores = [{ bulls: 0, bears: 0 }, { bulls: 0, bears: 0 }, { bulls: 0, bears: 0 }]
    const turns: { turn: number; player: number; result: 'bull' | 'bear' }[] = []
    const places: { place: number; playerIndex: number }[] = []
    let turnIdx = 0
    let turnSeed = seed + 400

    // Game loop: Turn until places assigned
    while (places.length < 3 && turns.length < 200) { // Safety break
        // Check if only 1 player active -> auto wins remaining place
        const activePlayers = [0, 1, 2].filter(i => !places.some(p => p.playerIndex === i))
        if (activePlayers.length === 1) {
            // Logic: If there is 1 person left, and places 3 and 2 are taken, they get place 1.
            // Or if place 3 is taken, and 2 people left...

            // Detailed Logic from LiveArena/TestPage:
            // "If only one player left without place -> check if place 1 exists?"
            // Ideally we assign places as they achieve victory/loss.
            // 3 Bulls = Win (Place 1)
            // 3 Bears = Lose (Last available place - e.g. 3rd, then 2nd)

            // If we are here, it means this last player hasn't finished yet, but everyone else has.
            // Usually the loop breaks before this if everyone finishes.

            // Let's assume standard loop covers most, handle edge case:
            // If 2 people eliminated (3rd, 2nd), last one is 1st.
            // If 1 person won (1st), and 1 eliminated (3rd), last one is 2nd.

            // Just assign the best available place to the last guy
            const takenPlaces = places.map(p => p.place)
            const availablePlaces = [1, 2, 3].filter(p => !takenPlaces.includes(p))
            // Best place is min(availablePlaces)
            // Actually usually last guy gets the best place (Survivor)
            const bestPlace = Math.min(...availablePlaces)
            places.push({ place: bestPlace, playerIndex: activePlayers[0] })
            break
        }

        const currentPlayer = turnOrder[turnIdx % 3]
        if (places.some(p => p.playerIndex === currentPlayer)) {
            turnIdx++
            continue
        }

        const result: 'bull' | 'bear' = seededRandom(turnSeed++) < 0.5 ? 'bull' : 'bear'
        playerScores[currentPlayer][result === 'bull' ? 'bulls' : 'bears']++
        turns.push({ turn: turns.length + 1, player: currentPlayer, result })

        if (playerScores[currentPlayer].bulls >= 3) {
            // Victory condition: 3 Bulls = 1st Place
            // NOTE: This allows multiple 1st places if we aren't careful?
            // No, usually first to reach 3 bulls wins.

            // Check if 1st place taken
            if (!places.some(p => p.place === 1)) {
                places.push({ place: 1, playerIndex: currentPlayer })
            } else {
                // If 1st taken, maybe 2nd?
                // Logic: First to 3 bulls wins. Game ends? Or others fight for 2nd/3rd?
                // "Bulls & Bears" usually: 3 Bulls = Win immediately. 3 Bears = Out immediately.

                // Let's stick to TestPage logic:
                // "3 БЫКА = 1 МЕСТО"
                // If 1st already taken (rare race condition in simultaneous turns, but here sequential),
                // take next best.
                const remaining = [1, 2, 3].filter(p => !places.some(pl => pl.place === p))
                // Take best
                places.push({ place: remaining[0], playerIndex: currentPlayer })
            }
        } else if (playerScores[currentPlayer].bears >= 3) {
            // 3 Bears = Elimination.
            // Gets lowest available place.
            // If 0 eliminated so far: gets 3rd.
            // If 1 eliminated so far (who got 3rd): gets 2nd.

            // removed unused eliminatedCount logic
            // Simple approach: Fill from bottom up for Bears.
            const takenPlaces = places.map(p => p.place)
            // If 3rd not taken, take 3rd.
            if (!takenPlaces.includes(3)) {
                places.push({ place: 3, playerIndex: currentPlayer })
            } else if (!takenPlaces.includes(2)) {
                places.push({ place: 2, playerIndex: currentPlayer })
            } else {
                // Should be 1st if everyone else eliminated?
                // Unlikely to get 3 bears and be 1st.
                places.push({ place: 1, playerIndex: currentPlayer })
            }
        }

        turnIdx++
    }

    const finalWinners = places.map(p => ({
        place: p.place,
        ticket_number: finalists3[p.playerIndex].ticket_number,
        username: finalists3[p.playerIndex].player.name,
        telegram_id: finalists3[p.playerIndex].user_id.toString()
    }))

    // Helper to convert Ticket to DrawParticipant
    const toParticipant = (t: Ticket): DrawParticipant => ({
        ticket_number: t.ticket_number,
        username: t.player.name,
        avatar: t.player.avatar,
        telegram_id: t.user_id.toString()
    })

    return {
        seed,
        tour1: {
            participants: tour1Winners.map(toParticipant)
        },
        tour2: {
            finalists: tour2Finalists.map(toParticipant)
        },
        semifinal: {
            spins,
            eliminated: eliminated.map((ticketNum, idx) => {
                const ticket = tour2Finalists.find(t => t.ticket_number === ticketNum)!
                return {
                    ticket_number: ticketNum,
                    username: ticket.player.name,
                    place: 5 - idx  // First eliminated = 5th, second = 4th
                }
            }),
            finalists3: finalists3.map(toParticipant)
        },
        final: { turn_order: turnOrder, turns },
        winners: finalWinners.sort((a, b) => a.place - b.place)
    }
}
