import colors from '@/Enums/Colors';

const segmentColorNames = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'indigo',
    'violet'
];

// Fallback color in case of undefined colors
const fallbackColor = [1, 0, 0, 1]; // Red

// Helper function to convert color array or number to a single number
function colorToNumber(color) {
    if (typeof color === 'number') {
        return color; // If it's already a number, return it as is
    }
    if (Array.isArray(color) && color.length === 4) {
        return (
            (Math.floor(color[0] * 255) << 24) |
            (Math.floor(color[1] * 255) << 16) |
            (Math.floor(color[2] * 255) << 8) |
            Math.floor(color[3] * 255)
        );
    }
    console.warn(`Invalid color: ${color}. Using fallback color.`);
    return colorToNumber(fallbackColor);
}

export function drawNgonAroundTarget(target, radius, segments = 24) {
    if (!target || target.dead || target.health <= 0) return;

    const canvas = imgui.getBackgroundDrawList();
    const step = (2 * Math.PI) / segments;
    const points = [];

    for (let i = 0; i < segments; i++) {
        const angle = step * i;
        const worldPoint = new Vector3(
            target.position.x + radius * Math.cos(angle),
            target.position.y + radius * Math.sin(angle),
            target.position.z
        );
        const screenPoint = wow.WorldFrame.getScreenCoordinates(worldPoint);
        if (screenPoint != undefined && screenPoint.x !== -1) {
            points.push(screenPoint);
        }
    }

    const currentTime = Date.now();
    const cycleSpeed = 1000; // Time in milliseconds for a full color cycle

    for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];
        
        // Calculate a color index that changes over time
        const colorIndex = Math.floor(((currentTime % cycleSpeed) / cycleSpeed + i / points.length) * segmentColorNames.length) % segmentColorNames.length;
        
        const colorName = segmentColorNames[colorIndex];
        const colorValue = colors[colorName] || fallbackColor;
        const segmentColor = colorToNumber(colorValue);
        canvas.addLine(start, end, segmentColor, 5);
    }
}