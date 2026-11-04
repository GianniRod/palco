import type { Metadata } from "next";
import { Card, PageTitle } from "../../../_components/shell";
import { CreateOrganizationForm } from "../_forms";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NewOrganizationPage() {
  return (
    <>
      <PageTitle>Nuevo cliente</PageTitle>
      <Card>
        <CreateOrganizationForm />
      </Card>
    </>
  );
}
