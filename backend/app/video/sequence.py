"""Small helpers for extending a short visual cut with selected shot inserts."""


def plan_selected_repeats(
    clips: list[tuple[str, float]],
    target_duration: float,
    segment_duration: float = 1.25,
) -> list[tuple[str, float, float]]:
    """Plan short repeats in the same semantic order as the selected shots.

    The plan repeats individual short segments rather than looping a complete
    montage. The caller renders each planned range into a new cut.
    """
    usable = [(path, float(duration)) for path, duration in clips if duration > 0]
    if not usable or target_duration <= sum(duration for _, duration in usable):
        return []

    remaining = target_duration - sum(duration for _, duration in usable)
    plan: list[tuple[str, float, float]] = []
    round_index = 0
    while remaining > 0.04 and len(plan) < 5000:
        added_this_round = 0.0
        for path, duration in usable:
            length = min(segment_duration, duration, remaining)
            if length <= 0:
                continue
            max_start = max(0.0, duration - length)
            # Move through each shot predictably between rounds instead of
            # rotating/reversing the scene order or restarting the exact same
            # frames on every repeat.
            start = (round_index * segment_duration) % (max_start + 0.001)
            start = min(start, max_start)
            plan.append((path, start, start + length))
            remaining -= length
            added_this_round += length
            if remaining <= 0.04 or len(plan) >= 5000:
                break
        if not added_this_round:
            break
        round_index += 1
    return plan
