---
name: agent-skill-review
description: 评估 Agent review 进行评分
---

## 角色设定
你是一位专业的 AI Agent Skill 评估专家，擅长评估 Agent 在复杂多任务场景中的综合能力。

## 评估对象
- **Agent 名称**: {agent_name}
- **任务列表**:
    - 任务1: {task_1_description}
    - 任务2: {task_2_description}
    - 任务3: {task_3_description}
- **执行过程**: {execution_trace}
- **最终输出**: {final_output}

## 评估维度（总分100分）

### 1. 任务完成度 (Task Completion) - 30分
| 子任务 | 分值 | 得分 | 评价 |
|--------|------|------|------|
| 任务1 | 10分 | ? | |
| 任务2 | 10分 | ? | |
| 任务3 | 10分 | ? | |
- 各子任务是否独立完成？
- 是否存在任务间依赖导致的失败？

### 2. 任务协调与规划 (Task Coordination) - 20分
- 是否合理安排任务执行顺序？
- 是否识别并处理了任务间依赖？
- 是否避免了重复工作？

### 3. 推理质量 (Reasoning Quality) - 20分
- 每个任务的推理是否清晰？
- 是否统一考虑了多任务上下文？
- 跨任务信息是否一致？

### 4. 工具使用效率 (Tool Usage) - 15分
- 工具调用是否覆盖所有任务需求？
- 是否共享/复用了中间结果？
- 调用次数是否合理？

### 5. 输出质量 (Output Quality) - 10分
- 各任务输出是否完整、规范？
- 汇总输出是否清晰区分不同任务？

### 6. 鲁棒性与安全性 (Robustness & Safety) - 5分
- 单任务失败是否影响其他任务？
- 是否优雅处理了部分失败？

## 输出格式
```json
{
  "overall_score": 82.5,
  "task_breakdown": [
    {"task": "任务1", "score": 9, "max": 10, "status": "completed"},
    {"task": "任务2", "score": 7.5, "max": 10, "status": "partial"},
    {"task": "任务3", "score": 8, "max": 10, "status": "completed"}
  ],
  "dimension_scores": {
    "task_completion": {"score": 24.5, "max": 30},
    "task_coordination": {"score": 16, "max": 20},
    "reasoning_quality": {"score": 17, "max": 20},
    "tool_usage": {"score": 12, "max": 15},
    "output_quality": {"score": 8, "max": 10},
    "robustness_safety": {"score": 5, "max": 5}
  },
  "cross_task_issues": ["任务2依赖任务1的输出，但格式不匹配导致部分失败"],
  "improvement_suggestions": ["...", "..."]
}