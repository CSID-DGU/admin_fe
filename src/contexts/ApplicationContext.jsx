import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { requestService } from "../services/requestService";

const ApplicationContext = createContext(null);

const STORAGE_KEY = "server_application_draft";
const TOTAL_STEPS = 6;

const INITIAL_FORM_DATA = {
  server_type: "",
  rsgroup_id: "",
  image_id: "",
  ubuntu_username: "",
  ubuntu_password: "",
  volume_size_gb: "",
  expires_at: "",
  usage_purpose: "",
  ubuntu_gids: [],
  port_requests: [],
};

function loadDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return null;
}

function saveDraft(currentStep, formData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, formData }));
  } catch {
    // ignore
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

const stepValidators = {
  1: (formData) => {
    const errors = {};
    if (!formData.server_type) {
      errors.server_type = "서버 유형을 선택해주세요.";
    }
    return errors;
  },
  2: (formData) => {
    const errors = {};
    if (!formData.rsgroup_id) {
      errors.rsgroup_id = "GPU 기종을 선택해주세요.";
    }
    if (!formData.image_id) {
      errors.image_id = "컨테이너 이미지를 선택해주세요.";
    }
    return errors;
  },
  3: (formData) => {
    const errors = {};
    if (!formData.ubuntu_username.trim()) {
      errors.ubuntu_username = "우분투 계정명을 입력해주세요.";
    } else if (!/^[a-z][a-z0-9_-]*[a-z0-9]$/.test(formData.ubuntu_username)) {
      errors.ubuntu_username = "소문자, 숫자, _, - 만 사용 가능합니다.";
    }
    if (!formData.ubuntu_password.trim()) {
      errors.ubuntu_password = "비밀번호를 입력해주세요.";
    } else if (formData.ubuntu_password.length < 4) {
      errors.ubuntu_password = "비밀번호는 최소 4자 이상이어야 합니다.";
    }
    return errors;
  },
  4: (formData) => {
    const errors = {};
    if (!formData.volume_size_gb) {
      errors.volume_size_gb = "볼륨 크기를 입력해주세요.";
    } else {
      const size = parseInt(formData.volume_size_gb);
      if (isNaN(size) || size < 10 || size > 2000) {
        errors.volume_size_gb = "볼륨 크기는 10GB ~ 2000GB 사이여야 합니다.";
      }
    }
    if (!formData.expires_at) {
      errors.expires_at = "사용 만료일을 선택해주세요.";
    } else {
      const expiryDate = new Date(formData.expires_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        errors.expires_at = "만료일은 오늘 이후 날짜여야 합니다.";
      }
    }
    if (!formData.usage_purpose.trim()) {
      errors.usage_purpose = "사용 목적을 입력해주세요.";
    } else if (formData.usage_purpose.length < 10) {
      errors.usage_purpose = "사용 목적을 10자 이상 입력해주세요.";
    }
    return errors;
  },
  5: () => ({}),
};

export const ApplicationProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const draft = loadDraft();

  const initialStep = () => {
    const urlStep = parseInt(searchParams.get("step"));
    if (urlStep >= 1 && urlStep <= TOTAL_STEPS) return urlStep;
    if (draft?.currentStep) return draft.currentStep;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState(() => {
    const base = { ...INITIAL_FORM_DATA, ...draft?.formData };
    if (!base.expires_at) {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      base.expires_at = d.toISOString().split("T")[0];
    }
    return base;
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [gpuTypes, setGpuTypes] = useState([]);
  const [containerImages, setContainerImages] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  const serverTypes = gpuTypes.reduce((acc, gpu) => {
    const name = gpu.serverName;
    if (!acc.find((s) => s.name === name)) {
      const gpusForServer = gpuTypes.filter((g) => g.serverName === name);
      const totalNodes = gpusForServer.reduce((sum, g) => sum + (g.availableNodes || 0), 0);
      acc.push({ name, totalNodes, gpuCount: gpusForServer.length });
    }
    return acc;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gpuRes, imgRes, grpRes] = await Promise.all([
          requestService.getGpuTypes(),
          requestService.getContainerImages(),
          requestService.getGroups(),
        ]);

        if (gpuRes.status === 200) {
          const data = gpuRes.data?.data || gpuRes.data;
          if (Array.isArray(data)) {
            setGpuTypes(
              data.map((gpu) => {
                let gpuModel = "Unknown GPU";
                if (gpu.description) {
                  const parts = gpu.description.trim().split(" ");
                  if (parts.length >= 2) gpuModel = parts.slice(0, 2).join(" ");
                }
                return { ...gpu, gpuModel };
              })
            );
          }
        }

        if (imgRes.status === 200) {
          const data = imgRes.data?.data || imgRes.data;
          if (Array.isArray(data)) setContainerImages(data);
        }

        if (grpRes.status === 200) {
          const data = grpRes.data?.data || grpRes.data;
          if (Array.isArray(data)) {
            setAvailableGroups(
              data.map((g) => ({
                ubuntu_gid: g.ubuntuGid || g.ubuntu_gid,
                group_name: g.groupName || g.group_name,
              }))
            );
          }
        }
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (currentStep <= 5) {
      saveDraft(currentStep, formData);
    }
  }, [currentStep, formData]);

  useEffect(() => {
    setSearchParams({ step: currentStep }, { replace: true });
  }, [currentStep, setSearchParams]);

  useEffect(() => {
    const onPopState = () => {
      const step = parseInt(new URLSearchParams(window.location.search).get("step"));
      if (step >= 1 && step <= TOTAL_STEPS) {
        setCurrentStep(step);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const validateStep = useCallback(
    (step) => {
      const validator = stepValidators[step];
      if (!validator) return {};
      return validator(formData);
    },
    [formData]
  );

  const isStepValid = useCallback(
    (step) => Object.keys(validateStep(step)).length === 0,
    [validateStep]
  );

  const getFirstIncompleteStep = useCallback(() => {
    for (let i = 1; i <= 5; i++) {
      if (!isStepValid(i)) return i;
    }
    return 5;
  }, [isStepValid]);

  const goNext = useCallback(() => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setTouched(
        Object.keys(stepErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      );
      return false;
    }
    setErrors({});
    setTouched({});
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
    return true;
  }, [currentStep, validateStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 1) {
      setErrors({});
      setTouched({});
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step) => {
      if (step < 1 || step > TOTAL_STEPS) return;
      if (step > currentStep) {
        for (let i = 1; i < step; i++) {
          if (!isStepValid(i)) {
            setCurrentStep(i);
            const stepErrors = validateStep(i);
            setErrors(stepErrors);
            return;
          }
        }
      }
      setErrors({});
      setTouched({});
      setCurrentStep(step);
    },
    [currentStep, isStepValid, validateStep]
  );

  const updateField = useCallback((name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "server_type" && value !== prev.server_type) {
        next.rsgroup_id = "";
        next.image_id = "";
      }
      return next;
    });
  }, []);

  const touchField = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const updateAvailableGroups = useCallback((newGroups) => {
    setAvailableGroups(newGroups);
  }, []);

  const submitApplication = useCallback(async () => {
    for (let i = 1; i <= 5; i++) {
      const stepErrors = validateStep(i);
      if (Object.keys(stepErrors).length > 0) {
        setCurrentStep(i);
        setErrors(stepErrors);
        return false;
      }
    }

    setIsSubmitting(true);
    try {
      const encodeBase64 = (str) => window.btoa(unescape(encodeURIComponent(str)));

      const requestData = {
        resourceGroupId: parseInt(formData.rsgroup_id),
        imageId: parseInt(formData.image_id),
        ubuntuUsername: formData.ubuntu_username,
        ubuntuPassword: encodeBase64(formData.ubuntu_password),
        volumeSizeGiB: parseInt(formData.volume_size_gb),
        usagePurpose: formData.usage_purpose,
        formAnswers: {},
        expiresAt: new Date(formData.expires_at).toISOString(),
        ubuntuGids: formData.ubuntu_gids,
        portRequests: formData.port_requests,
      };

      const response = await requestService.createRequest(requestData);

      if (response.status === 200 || response.status === 201) {
        clearDraft();
        setCurrentStep(6);
        return true;
      } else {
        throw new Error("서버 신청 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Server application error:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateStep]);

  const resetForm = useCallback(() => {
    clearDraft();
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setFormData({ ...INITIAL_FORM_DATA, expires_at: d.toISOString().split("T")[0] });
    setCurrentStep(1);
    setErrors({});
    setTouched({});
  }, []);

  return (
    <ApplicationContext.Provider
      value={{
        currentStep,
        totalSteps: TOTAL_STEPS,
        formData,
        errors,
        touched,
        isSubmitting,
        isInitialLoading,
        gpuTypes,
        containerImages,
        availableGroups,
        serverTypes,
        goNext,
        goPrev,
        goToStep,
        updateField,
        touchField,
        validateStep,
        isStepValid,
        getFirstIncompleteStep,
        submitApplication,
        resetForm,
        updateAvailableGroups,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplication = () => {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useApplication must be used within ApplicationProvider");
  return ctx;
};
