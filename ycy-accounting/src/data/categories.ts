// ycy记账 — 两级花销分类数据

/** 分类数据：一级分类 → 二级分类列表 */
export const CATEGORY_MAP: Record<string, string[]> = {
  '餐饮饮食': ['早餐', '午餐', '晚餐', '零食饮料', '水果', '外卖', '买菜做饭'],
  '交通出行': ['公交地铁', '出租车/网约车', '加油充电', '停车费', '火车高铁', '飞机'],
  '购物消费': ['衣服鞋帽', '日用品', '数码电子', '家居装饰', '美妆护肤'],
  '住房生活': ['房租', '水电燃气', '物业费', '网费电话', '维修保养', '日杂'],
  '医疗健康': ['看病买药', '体检', '健身运动', '保健品'],
  '教育学习': ['书籍', '课程培训', '文具', '考试报名'],
  '娱乐休闲': ['电影演出', '游戏', '旅游度假', 'KTV/酒吧', '宠物'],
  '人情往来': ['送礼红包', '请客吃饭', '婚礼份子', '捐款'],
  '投资理财': ['股票基金', '保险', '储蓄', '借贷还款'],
  '其他支出': ['快递物流', '手续费', '其他'],
};

/** 一级分类列表 */
export const CATEGORY_LIST = Object.keys(CATEGORY_MAP);

/** 根据一级分类获取二级分类列表 */
export function getSubcategories(category: string): string[] {
  return CATEGORY_MAP[category] || [];
}

/** 预置分类种子数据（供数据库初始化使用） */
export const PRESET_CATEGORIES: { name: string; subcategories: string[] }[] =
  CATEGORY_LIST.map((name) => ({
    name,
    subcategories: CATEGORY_MAP[name],
  }));
