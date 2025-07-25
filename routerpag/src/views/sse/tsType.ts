export interface HouseSize {
    baseWidth: number;
    baseLength: number;
    baseHeight: number;
    baseThickness: number;
    peakHeight: number;
    peakWidth: number; // 明确为必填项
    doorWidth: number;
    doorHeight: number;
    baseImg: string;
    tileUrl: string;
    doorImg: string;
}

export interface PositionData {
    x: number,
    y: number,
    z: number,
}