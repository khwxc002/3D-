import wallbUrl from '@/assets/img/bmqiang.jpg'
import tileUrl from '@/assets/img/tile.jpg'
import doorUrl from '@/assets/img/door.jpg'

// 房屋尺寸接口
interface HouseSize {
  baseWidth: number;
  baseLength: number;
  baseHeight: number;
  baseThickness: number;
  peakHeight: number;
  peakWidth: number;
  doorWidth: number;
  doorHeight: number;
  baseImg: string;
  tileUrl: string;
  doorImg: string;
}

// 位置坐标接口
interface PositionData {
  x: number;
  y: number;
  z: number;
}

// 房屋数据配置
const houseSize: HouseSize = {
  baseWidth: 40,    // 房屋宽度
  baseLength: 60,   // 房屋长度
  baseHeight: 20,   // 墙面高度
  baseThickness: 1, // 墙面厚度
  peakHeight: 6,    // 顶面高度(顶点突出高度)
  peakWidth: 2,     // 顶面宽度(顶点宽度)
  doorWidth: 10,    // 门宽度
  doorHeight: 16,   // 门高度
  baseImg: wallbUrl, // 墙面图片
  tileUrl: tileUrl,  // 瓷砖图片
  doorImg: doorUrl   // 门图片
}

// 房屋位置配置
const housePosition: PositionData = {
  x: 0,
  y: 1,
  z: 0
}

const housePositiontwo: PositionData = {
  x: 100,
  y: 1,
  z: 100
}

// 获取房屋数据
export function getHoursData() {
  return {
    houseSize,
    housePosition,
    housePositiontwo
  }
}

// 房屋尺寸类型
export type { HouseSize, PositionData }