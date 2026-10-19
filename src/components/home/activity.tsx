import { CustomList, CustomListItem } from "@/ui/custom-list";
import Link from "next/link";

export function Activity() {
  return (
    <div className="max-w-xl mx-auto my-4 px-4 home-page-content">
      <CustomList>
        <CustomListItem>
          <p className="font-bold">Currently:</p>
        </CustomListItem>
        <CustomListItem isSubItem>
          Studying CS @{" "}
          <Link href="https://uwaterloo.ca" target="_blank">
            University of Waterloo
          </Link>
        </CustomListItem>
        <CustomListItem isSubItem>
          Product/ML Engineer @{" "}
          <Link href="https://coderabbit.ai" target="_blank">
            CodeRabbit
          </Link>
        </CustomListItem>
      </CustomList>

      <div className="my-4" />

      <CustomList>
        <CustomListItem>
          <p className="font-bold">Recently:</p>
        </CustomListItem>
        <CustomListItem isSubItem>
          Software Developer @{" "}
          <Link href="https://airfairness.com" target="_blank">
            airfairness
          </Link>
        </CustomListItem>
        <CustomListItem isSubItem>
          President + Advisor @{" "}
          <Link href="https://csclub.uwaterloo.ca" target="_blank">
            UW Computer Science Club
          </Link>
        </CustomListItem>
      </CustomList>

      <div className="my-4" />

      <CustomList>
        <CustomListItem>
          I write <Link href="/articles">articles</Link>.
        </CustomListItem>
      </CustomList>

      <div className="my-4" />
    </div>
  );
}
