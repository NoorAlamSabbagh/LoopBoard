export type StudyPlanPort = {
  generate(input: { userId: string; companyName?: string; weakTopics: string[] }): Promise<{ items: { title: string; reason: string }[] }>;
};

export const noopStudyPlanAdapter: StudyPlanPort = {
  async generate() {
    return { items: [] };
  },
};

export const ai = {
  studyPlan: noopStudyPlanAdapter,
};
