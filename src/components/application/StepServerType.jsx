import { useApplication } from "../../contexts/ApplicationContext";
import { Cards, FormField, Badge, StatusIndicator } from "../../design-system";

const StepServerType = () => {
  const { formData, updateField, serverTypes, errors } = useApplication();

  if (serverTypes.length === 0) {
    return (
      <div className="py-12 text-center">
        <StatusIndicator type="loading">
          서버 유형 정보를 불러오고 있어요...
        </StatusIndicator>
      </div>
    );
  }

  return (
    <FormField errorText={errors.server_type}>
      <Cards
        items={serverTypes}
        trackBy="name"
        columns={2}
        selectionType="single"
        selectedItems={serverTypes.filter((s) => s.name === formData.server_type)}
        onSelectionChange={([server]) => updateField("server_type", server.name)}
        cardDefinition={{
          header: (server) => server.name,
          sections: [
            {
              id: "gpu",
              header: "GPU 종류",
              content: (server) => `${server.gpuCount}종`,
            },
            {
              id: "availability",
              content: (server) =>
                server.totalNodes > 0 ? (
                  <Badge color="green">{server.totalNodes}대 바로 사용 가능</Badge>
                ) : (
                  <Badge color="red">지금은 자리가 없어요</Badge>
                ),
            },
          ],
        }}
      />
    </FormField>
  );
};

export default StepServerType;
