import { useCallback } from "react";
import { useApplication } from "../contexts/ApplicationContext";

export const useApplicationForm = () => {
  const ctx = useApplication();

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      ctx.updateField(name, value);
    },
    [ctx]
  );

  const handleBlur = useCallback(
    (e) => {
      ctx.touchField(e.target.name);
    },
    [ctx]
  );

  const getFieldError = useCallback(
    (name) => {
      if (ctx.touched[name] && ctx.errors[name]) return ctx.errors[name];
      return "";
    },
    [ctx.touched, ctx.errors]
  );

  const addGroup = useCallback(
    (gid) => {
      if (!ctx.formData.ubuntu_gids.includes(gid)) {
        ctx.updateField("ubuntu_gids", [...ctx.formData.ubuntu_gids, gid]);
      }
    },
    [ctx]
  );

  const removeGroup = useCallback(
    (gid) => {
      ctx.updateField(
        "ubuntu_gids",
        ctx.formData.ubuntu_gids.filter((id) => id !== gid)
      );
    },
    [ctx]
  );

  const addPort = useCallback(
    (port, usagePurpose = "") => {
      const portNumber = parseInt(port);
      if (portNumber && portNumber > 0 && portNumber <= 65535) {
        if (!ctx.formData.port_requests.find((p) => p.internalPort === portNumber)) {
          ctx.updateField("port_requests", [
            ...ctx.formData.port_requests,
            { internalPort: portNumber, usagePurpose: usagePurpose || `포트 ${portNumber}` },
          ]);
        }
      }
    },
    [ctx]
  );

  const removePort = useCallback(
    (port) => {
      ctx.updateField(
        "port_requests",
        ctx.formData.port_requests.filter((p) => p.internalPort !== port)
      );
    },
    [ctx]
  );

  const updatePortUsagePurpose = useCallback(
    (port, usagePurpose) => {
      ctx.updateField(
        "port_requests",
        ctx.formData.port_requests.map((p) =>
          p.internalPort === port ? { ...p, usagePurpose } : p
        )
      );
    },
    [ctx]
  );

  return {
    ...ctx,
    handleChange,
    handleBlur,
    getFieldError,
    addGroup,
    removeGroup,
    addPort,
    removePort,
    updatePortUsagePurpose,
  };
};
