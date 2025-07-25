// interactiveControls.ts
import wallbUrl from '@/assets/img/bmqiang.jpg'
import tileUrl from '@/assets/img/tile.jpg'
import doorUrl from '@/assets/img/door.jpg' // 新增门纹理导入

interface HouseSize {
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

// 房子的尺寸参数
const houseSize: HouseSize = {
  baseWidth: 40, // 房屋宽度
  baseLength: 60, // 房屋长度
  baseHeight: 20, // 墙面高度
  baseThickness: 1, // 墙面厚度
  peakHeight: 6, // 顶面高度(顶点突出高度)
  peakWidth: 2, // 顶面宽度(顶点宽度)
  doorWidth: 10, // 门宽度
  doorHeight: 16, // 门高度
  baseImg: wallbUrl, // 墙面图片
  tileUrl: tileUrl, // 瓷砖图片
  doorImg: doorUrl, // 新增门图片
}

// 房子的坐标
const housePosition = {
  x: 0,
  y: 1,
  z: 0,
}
// 房子的坐标2
const housePositiontwo = {
  x: 100,
  y: 1,
  z: 100,
}
// 或者如果需要更新对象，可以导出函数形式
export function getHoursData() {
  return {
    houseSize,
    housePosition,
    housePositiontwo
  }
}