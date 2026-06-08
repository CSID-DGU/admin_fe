const valueOrFallback = (...values) =>
  values.find((value) => value !== undefined && value !== null);

export const normalizeGpuType = (gpu) => {
  const description = valueOrFallback(gpu.description, "");
  let gpuModel = valueOrFallback(
    gpu.gpuModel,
    gpu.gpu_model,
    gpu.resourceGroupName,
    gpu.resource_group_name,
    "Unknown GPU"
  );

  if (!gpu.gpuModel && !gpu.gpu_model && description) {
    const parts = description.trim().split(" ");
    if (parts.length >= 2) gpuModel = parts.slice(0, 2).join(" ");
  }

  return {
    ...gpu,
    rsgroupId: valueOrFallback(
      gpu.rsgroupId,
      gpu.rsgroup_id,
      gpu.resourceGroupId,
      gpu.resource_group_id,
      gpu.id
    ),
    serverName: valueOrFallback(gpu.serverName, gpu.server_name, "Unknown Server"),
    gpuModel,
    ramGb: valueOrFallback(gpu.ramGb, gpu.ram_gb, gpu.ramGiB, gpu.ram_gib, 0),
    availableNodes: valueOrFallback(
      gpu.availableNodes,
      gpu.available_nodes,
      gpu.availableNodeCount,
      gpu.available_node_count,
      0
    ),
    nodeId: valueOrFallback(gpu.nodeId, gpu.node_id, gpu.nodeName, gpu.node_name, ""),
    description,
  };
};

export const normalizeContainerImage = (image) => ({
  ...image,
  imageId: valueOrFallback(image.imageId, image.image_id, image.id),
  imageName: valueOrFallback(image.imageName, image.image_name, "Unknown"),
  imageVersion: valueOrFallback(image.imageVersion, image.image_version, ""),
  cudaVersion: valueOrFallback(image.cudaVersion, image.cuda_version, ""),
  description: valueOrFallback(image.description, ""),
});
