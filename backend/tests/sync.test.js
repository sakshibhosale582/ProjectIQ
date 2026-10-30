const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('Sync Suite: State, Roadmap Progression & State Synchronization', () => {

  describe('Learning Path Module Progression & Unlocking', () => {
    // In-memory simulation of LearningProgress and User database state
    let mockUser;
    let mockProgressRecords;
    const moduleSequence = ['fundamental', 'architecture', 'backend', 'database', 'quality'];

    beforeEach(() => {
      mockUser = {
        _id: 'user_123',
        name: 'Alex Dev',
        email: 'alex@example.com'
      };
      mockProgressRecords = [];
    });

    const completeModuleHandler = (moduleId) => {
      let progress = mockProgressRecords.find(p => p.moduleId === moduleId);
      const isAlreadyCompleted = progress && progress.completionStatus === 'completed';

      if (!progress) {
        progress = { moduleId, completionStatus: 'completed', progress: 100 };
        mockProgressRecords.push(progress);
      } else {
        progress.completionStatus = 'completed';
        progress.progress = 100;
      }

      // Unlock next module in order
      const currentIdx = moduleSequence.indexOf(moduleId);
      if (currentIdx !== -1 && currentIdx + 1 < moduleSequence.length) {
        const nextId = moduleSequence[currentIdx + 1];
        let nextProg = mockProgressRecords.find(p => p.moduleId === nextId);
        if (!nextProg) {
          mockProgressRecords.push({ moduleId: nextId, completionStatus: 'in-progress', progress: 30 });
        } else if (nextProg.completionStatus === 'locked') {
          nextProg.completionStatus = 'in-progress';
        }
      }

      return {
        user: { ...mockUser },
        alreadyCompleted: Boolean(isAlreadyCompleted),
        progressList: [...mockProgressRecords]
      };
    };

    it('marks module as completed and unlocks the next module in sequence', () => {
      const res1 = completeModuleHandler('fundamental');

      assert.strictEqual(res1.alreadyCompleted, false);

      // Check module statuses
      const fundamental = res1.progressList.find(p => p.moduleId === 'fundamental');
      const architecture = res1.progressList.find(p => p.moduleId === 'architecture');
      assert.strictEqual(fundamental.completionStatus, 'completed');
      assert.strictEqual(architecture.completionStatus, 'in-progress');
    });

    it('maintains idempotency when the same module is completed multiple times', () => {
      // First attempt
      const res1 = completeModuleHandler('fundamental');
      assert.strictEqual(res1.alreadyCompleted, false);

      // Second attempt (duplicate click / refresh)
      const res2 = completeModuleHandler('fundamental');
      assert.strictEqual(res2.alreadyCompleted, true);

      // Third attempt
      const res3 = completeModuleHandler('fundamental');
      assert.strictEqual(res3.alreadyCompleted, true);
    });

    it('advances through multiple sequential modules and updates completion state', () => {
      completeModuleHandler('fundamental');
      completeModuleHandler('architecture');
      const res3 = completeModuleHandler('backend');

      // Check database progress records
      const backend = res3.progressList.find(p => p.moduleId === 'backend');
      const database = res3.progressList.find(p => p.moduleId === 'database');
      assert.strictEqual(backend.completionStatus, 'completed');
      assert.strictEqual(database.completionStatus, 'in-progress');
    });
  });

  describe('Active Project State & Refresh Synchronization', () => {
    it('restores previously selected active project using stored ID', () => {
      const mockProjects = [
        { _id: 'proj_1', name: 'Alpha Project' },
        { _id: 'proj_2', name: 'Beta Project' },
        { _id: 'proj_3', name: 'Gamma Project' }
      ];

      const resolveActiveProject = (savedId, projectList) => {
        if (!projectList || projectList.length === 0) return null;
        if (savedId) {
          const found = projectList.find(p => p._id === savedId);
          if (found) return found;
        }
        return projectList[0];
      };

      // Case 1: Saved ID exists for proj_2
      const active1 = resolveActiveProject('proj_2', mockProjects);
      assert.strictEqual(active1._id, 'proj_2');
      assert.strictEqual(active1.name, 'Beta Project');

      // Case 2: No saved ID -> defaults to first project
      const active2 = resolveActiveProject(null, mockProjects);
      assert.strictEqual(active2._id, 'proj_1');

      // Case 3: Stale saved ID (project deleted) -> falls back to first project
      const active3 = resolveActiveProject('deleted_id', mockProjects);
      assert.strictEqual(active3._id, 'proj_1');
    });

    it('clears all session and project states on logout', () => {
      let localStorageMock = {
        projectiq_token: 'valid_jwt_token',
        projectiq_active_project_id: 'proj_1',
        projectiq_theme: 'dark'
      };

      const logoutHandler = () => {
        delete localStorageMock.projectiq_token;
        delete localStorageMock.projectiq_active_project_id;
        return {
          isAuthenticated: false,
          user: { name: 'Developer Profile', email: '' },
          projects: [],
          activeProject: null,
          roadmap: []
        };
      };

      const cleanState = logoutHandler();
      assert.strictEqual(localStorageMock.projectiq_token, undefined);
      assert.strictEqual(localStorageMock.projectiq_active_project_id, undefined);
      assert.strictEqual(localStorageMock.projectiq_theme, 'dark'); // Theme preserved
      assert.strictEqual(cleanState.isAuthenticated, false);
      assert.strictEqual(cleanState.activeProject, null);
      assert.strictEqual(cleanState.projects.length, 0);
      assert.strictEqual(cleanState.roadmap.length, 0);
    });
  });
});
