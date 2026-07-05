import React, { useState, useEffect } from 'react';
import { getImages, createImage } from '../../services/imageService';
import {
  Alert,
  Badge,
  Button,
  Container,
  FormField,
  Header,
  Input,
  Table,
} from '../../design-system';

const ImageManagementPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    imageName: '',
    imageVersion: '',
    cudaVersion: '',
    description: ''
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const result = await getImages();
      if (result.success) {
        setImages(result.data);
      } else {
        setAlert({
          type: 'error',
          message: result.error
        });
      }
    } catch {
      setAlert({
        type: 'error',
        message: '이미지 목록을 불러오는데 실패했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  // DECS Input은 onChange(value)로 값을 전달
  const handleFieldChange = (name) => (value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateImage = async (e) => {
    e?.preventDefault?.();

    // 폼 유효성 검사
    if (!formData.imageName || !formData.imageVersion || !formData.cudaVersion || !formData.description) {
      setAlert({
        type: 'error',
        message: '모든 필드를 입력해주세요.'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createImage(formData);
      if (result.success) {
        setAlert({
          type: 'success',
          message: '이미지가 성공적으로 생성되었습니다.'
        });
        setFormData({
          imageName: '',
          imageVersion: '',
          cudaVersion: '',
          description: ''
        });
        setShowCreateForm(false);
        fetchImages(); // 목록 새로고침
      } else {
        setAlert({
          type: 'error',
          message: result.error
        });
      }
    } catch {
      setAlert({
        type: 'error',
        message: '이미지 생성 중 문제가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    { id: 'imageId', header: 'ID', width: '70px', cell: (image) => image.imageId },
    {
      id: 'imageName',
      header: '이미지 이름',
      cell: (image) => (
        <span className="font-medium text-(--decs-text-heading)">{image.imageName}</span>
      ),
    },
    {
      id: 'imageVersion',
      header: '버전',
      cell: (image) => <Badge color="blue">{image.imageVersion}</Badge>,
    },
    {
      id: 'cudaVersion',
      header: 'CUDA 버전',
      cell: (image) => <Badge color="green">CUDA {image.cudaVersion}</Badge>,
    },
    { id: 'description', header: '설명', minWidth: '200px', cell: (image) => image.description },
    {
      id: 'createdAt',
      header: '생성일',
      cell: (image) => (
        <span className="text-(--decs-text-secondary)">{formatDate(image.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        variant="h1"
        description="컨테이너 생성에 사용할 도커 이미지를 관리합니다."
        actions={
          <Button
            variant={showCreateForm ? 'normal' : 'primary'}
            iconName={showCreateForm ? undefined : 'plus'}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '취소' : '새 이미지 생성'}
          </Button>
        }
      >
        이미지 관리
      </Header>

      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {showCreateForm && (
        <Container header={<Header variant="h2">새 이미지 생성</Header>}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="이미지 이름" htmlFor="image-name">
                <Input
                  id="image-name"
                  value={formData.imageName}
                  onChange={handleFieldChange('imageName')}
                  placeholder="예: cuda"
                />
              </FormField>
              <FormField label="이미지 버전" htmlFor="image-version">
                <Input
                  id="image-version"
                  value={formData.imageVersion}
                  onChange={handleFieldChange('imageVersion')}
                  placeholder="예: 12.4"
                />
              </FormField>
              <FormField label="CUDA 버전" htmlFor="cuda-version">
                <Input
                  id="cuda-version"
                  value={formData.cudaVersion}
                  onChange={handleFieldChange('cudaVersion')}
                  placeholder="예: 12.4"
                />
              </FormField>
            </div>
            <FormField label="설명" htmlFor="image-description">
              <Input
                id="image-description"
                value={formData.description}
                onChange={handleFieldChange('description')}
                placeholder="이미지에 대한 설명을 입력하세요"
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="primary" loading={loading} onClick={handleCreateImage}>
                생성
              </Button>
              <Button onClick={() => setShowCreateForm(false)}>취소</Button>
            </div>
          </div>
        </Container>
      )}

      <Container disablePadding>
        <Table
          density="compact"
          trackBy="imageId"
          columns={columns}
          items={images}
          loading={loading && !showCreateForm}
          empty="등록된 이미지가 없습니다."
          header={
            <Header variant="h2" counter={`(${images.length})`}>
              이미지 목록
            </Header>
          }
        />
      </Container>
    </div>
  );
};

export default ImageManagementPage;
