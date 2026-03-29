import React, { useState } from 'react';
import { Modal, Upload, Button, message, Progress } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import { customerService } from '@/services';
import { CustomerExcelUtils } from '@/utils/CustomerExcelUtils';

const { Dragger } = Upload;

interface BatchImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file: RcFile) => {
      // 验证文件类型
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileType || '')) {
        message.error('只能上传 CSV 或 Excel 文件！');
        return false;
      }

      // 验证文件大小（最大 10MB）
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！');
        return false;
      }

      return true;
    },
    customRequest: async ({ file, onSuccess, onError }: any) => {
      setUploading(true);
      setProgress(0);

      try {
        // 模拟进度
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // 使用 Excel 工具解析文件
        const customers = await CustomerExcelUtils.importFromExcel(file as File);

        if (customers.length === 0) {
          message.warning('文件中没有有效的客户数据');
          setUploading(false);
          return;
        }

        // 过滤掉 name 为空的数据并转换类型
        const validCustomers = customers.filter(c => c.name).map(c => ({
          ...c,
          name: c.name!, // 确保 name 不为空
        }));

        // 调用批量创建 API
        await customerService.batchCreate(validCustomers);

        clearInterval(progressInterval);
        setProgress(100);

        message.success(`成功导入 ${customers.length} 个客户`);
        onSuccess?.();
        
        setTimeout(() => {
          onClose();
          setProgress(0);
        }, 500);
      } catch (error: any) {
        message.error('导入失败：' + error.message);
        if (onError) onError(error);
      } finally {
        setUploading(false);
      }
    },
    onRemove: () => {
      setProgress(0);
      return true;
    },
  };

  return (
    <Modal
      title="批量导入客户"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden  // 修复 antd 警告
      width={600}
    >
      <div style={{ padding: '20px 0' }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 CSV、Excel (.xlsx, .xls) 格式，文件大小不超过 10MB
          </p>
        </Dragger>

        {uploading && (
          <div style={{ marginTop: '20px' }}>
            <Progress percent={progress} status="active" />
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📋 导入说明：</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            <li>CSV 文件请使用 UTF-8 编码</li>
            <li>必填字段：name（客户名称）</li>
            <li>可选字段：email, phone, city, province, totalAssets 等</li>
            <li>系统将自动跳过重复的邮箱或手机号</li>
            <li>导入成功后将显示导入结果统计</li>
          </ul>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #d9d9d9' }}>
            <Button 
              type="link" 
              icon={<DownloadOutlined />} 
              onClick={async () => {
                try {
                  await CustomerExcelUtils.downloadTemplate();
                  message.success('模板下载成功');
                } catch (error: any) {
                  message.error('下载模板失败：' + error.message);
                }
              }}
            >
              下载 Excel 模板
            </Button>
          </div>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Button onClick={onClose} disabled={uploading}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BatchImportModal;
