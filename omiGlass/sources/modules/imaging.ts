// For now, just return the original image as we can't use the web APIs in React Native
// In a real app, you would use a library like react-native-image-manipulator
export function rotateImage(src: Uint8Array, angle: '90' | '180' | '270') {
    return Promise.resolve(src);
}