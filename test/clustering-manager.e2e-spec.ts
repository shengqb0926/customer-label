    it('should create dbscan clustering config', async () => {
      const createDto = {
        configName: 'DBSCAN 分群配置',
        algorithm: 'dbscan',
        parameters: {
          eps: 0.5,
          minPoints: 5,
        },
        isActive: true,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send(createDto)
        .expect(201);

      expect(response.body.algorithm).toBe('dbscan');
    });

    it('should fail to create config with duplicate name', async () => {
      const createDto = {
        configName: '客户分群配置',
        algorithm: 'k-means',
        parameters: { k: 3 },
      };

      return setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send(createDto)
        .expect(400);
    });

    it('should fail with invalid algorithm', async () => {
      const createDto = {
        configName: '无效算法配置',
        algorithm: 'invalid-algorithm',
        parameters: {},
      };

      return setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send(createDto)
        .expect(400);
    });

    it('should fail k-means without required k parameter', async () => {
      const createDto = {
        configName: '缺少参数配置',
        algorithm: 'k-means',
        parameters: {
          maxIterations: 100,
        },
      };

      return setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send(createDto)
        .expect(400);
    });
  });

  describe('/clustering (GET)', () => {
    it('should get clustering configs list', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/clustering'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/clustering?page=1&limit=5'),
        authToken
      )
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });

    it('should filter by algorithm', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/clustering?algorithm=k-means'),
        authToken
      )
        .expect(200);

      response.body.data.forEach((config: any) => {
        expect(config.algorithm).toBe('k-means');
      });
    });

    it('should filter by isActive status', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/clustering?isActive=true'),
        authToken
      )
        .expect(200);

      response.body.data.forEach((config: any) => {
        expect(config.isActive).toBe(true);
      });
    });
  });

  describe('/clustering/:id (GET)', () => {
    it('should get config by id', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/clustering/${createdConfigId}`),
        authToken
      )
        .expect(200);

      expect(response.body.id).toBe(createdConfigId);
      expect(response.body.configName).toBe('客户分群配置');
      expect(response.body.algorithm).toBe('k-means');
    });

    it('should return 404 for non-existent config', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).get('/clustering/999999'),
        authToken
      )
        .expect(404);
    });
  });

  describe('/clustering/:id (PUT)', () => {
    it('should update config', async () => {
      const updateDto = {
        parameters: {
          k: 6,
          maxIterations: 150,
        },
        isActive: false,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).put(`/clustering/${createdConfigId}`),
        authToken
      )
        .send(updateDto)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.parameters.k).toBe(6);
    });

    it('should fail to update with invalid algorithm', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).put(`/clustering/${createdConfigId}`),
        authToken
      )
        .send({ algorithm: 'invalid' })
        .expect(400);
    });
  });

  describe('/clustering/:id/activate (POST)', () => {
    it('should activate config', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/activate`),
        authToken
      )
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('/clustering/:id/deactivate (POST)', () => {
    it('should deactivate config', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/deactivate`),
        authToken
      )
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('/clustering/:id/run (POST)', () => {
    it('should run clustering analysis', async () => {
      // First activate the config
      await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/activate`),
        authToken
      )
        .expect(200);

      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/run`),
        authToken
      )
        .send({
          customerIds: [1, 2, 3, 4, 5],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.clusterCount).toBeDefined();
      expect(response.body.executionTime).toBeDefined();
    });

    it('should fail to run inactive config', async () => {
      // First deactivate the config
      await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/deactivate`),
        authToken
      )
        .expect(200);

      return setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/run`),
        authToken
      )
        .expect(400);
    });
  });

  describe('/clustering/:id/stats (GET)', () => {
    it('should get clustering stats after running', async () => {
      // Run clustering first
      await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/activate`),
        authToken
      )
        .expect(200);

      await setAuthHeader(
        request(app.getHttpServer()).post(`/clustering/${createdConfigId}/run`),
        authToken
      )
        .expect(201);

      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/clustering/${createdConfigId}/stats`),
        authToken
      )
        .expect(200);

      expect(response.body.configName).toBe('客户分群配置');
      expect(response.body.algorithm).toBe('k-means');
      expect(response.body.clusterCount).toBeDefined();
      expect(response.body.lastRunAt).toBeDefined();
      expect(response.body.isActive).toBe(true);
    });

    it('should return null for config that never ran', async () => {
      // Create a new config but don't run it
      const createResponse = await setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send({
          configName: '未运行配置',
          algorithm: 'k-means',
          parameters: { k: 3 },
        })
        .expect(201);

      const newConfigId = parseInt(createResponse.body.id);

      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/clustering/${newConfigId}/stats`),
        authToken
      )
        .expect(404);
    });
  });

  describe('/clustering/:id (DELETE)', () => {
    it('should delete config', async () => {
      // First create a config to delete
      const createResponse = await setAuthHeader(
        request(app.getHttpServer()).post('/clustering'),
        authToken
      )
        .send({
          configName: '待删除配置',
          algorithm: 'k-means',
          parameters: { k: 2 },
        })
        .expect(201);

      const configIdToDelete = parseInt(createResponse.body.id);

      // Delete the config
      await setAuthHeader(
        request(app.getHttpServer()).delete(`/clustering/${configIdToDelete}`),
        authToken
      )
        .expect(200);

      // Verify deletion
      return setAuthHeader(
        request(app.getHttpServer()).get(`/clustering/${configIdToDelete}`),
        authToken
      )
        .expect(404);
    });
  });
});
