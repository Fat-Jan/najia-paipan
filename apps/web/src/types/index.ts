// 前端类型 — 排盘相关类型直接复用 @najia/core，此处只定义前端特有类型
import type {
  HexagramResult,
  YaoParam,
  Gender,
  YaoRelation,
  GuaShenInfo,
  DayDynamics,
  YingQi,
  SanHe,
} from '@najia/core';

export type {
  HexagramResult,
  YaoParam,
  Gender,
  YaoRelation,
  GuaShenInfo,
  DayDynamics,
  YingQi,
  SanHe,
};

// AI 智能解读请求（走后端 /interpret）
export interface InterpretRequest {
  hexagram_data: {
    name: string;
    gong: string;
    mark: string;
    shiy: number[];
    qin6: string[];
    qinx: string[];
    god6: string[];
    yue_ling?: string[];
    yue_zhi?: string;
    ri_chen?: string;
    // 旬空/月破：逐爻布尔（core 算好透传，AI 不必自行推旬空）
    xun_kong?: boolean[];
    yue_po?: boolean[];
    dong: number[];
    bian_name?: string;
    hide_name?: string;
    // 变卦逐爻（动爻变出的卦象，供 AI 分析动变关系，避免瞎编）
    bian_qin6?: string[];
    bian_qinx?: string[];
    // 伏神逐爻
    hide_qin6?: string[];
    hide_qinx?: string[];
    hide_seat?: number[];
    // 卦爻动变关系（反吟/伏吟/进退神），core 已算好直接透传
    yao_relation?: YaoRelation | null;
    // 卦身（月卦身），core 已算好直接透传
    gua_shen?: GuaShenInfo | null;
    // 暗动/日破（core 已算好直接透传）
    day_dynamics?: DayDynamics | null;
    // 应期候选地支（前端调 calcYingQi 后透传）
    ying_qi?: YingQi | null;
    // 三合局/半合（core compile 恒算直接透传）
    san_he?: SanHe | null;
    // 用神标记（问题→用神六亲→爻位 + 原忌仇神），前端算好传后端
    yongshen?: {
      category: string;
      yongshen: string;
      positions: number[];
      multiple: boolean;
      hidden: boolean;
      hidden_seat: number[];
      yuanshen: { qin: string; positions: number[] };
      jishen: { qin: string; positions: number[] };
      choushen: { qin: string; positions: number[] };
      primary_pos: number;
      primary_zhi: string;
      note: string;
    };
  };
  question: string;
}

// AI 智能解读响应
export interface InterpretResponse {
  hexagram_name: string;
  jixiong: string;
  rule_analysis: {
    wuxing_balance: string;
    shiy_relation: string;
    yueling_status: string;
    dongyao_analysis: string;
    jixiong: string;
  };
  ai_interpretation: string;
}

// 历史记录项
export interface HistoryItem {
  id: string;
  params: YaoParam[];
  date: string;
  gender?: Gender;
  title?: string;
  result: HexagramResult;
  createdAt: string;
}
