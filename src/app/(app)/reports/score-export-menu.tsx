"use client";

import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadLearningScoreReportsExcel } from "@/lib/reports/score-export-excel";
import type { ClassLearningScoreReport, LearningScoreType } from "@/types/reports";

export function ScoreExportMenu({
  annualReports,
  semesterReports,
}: {
  annualReports: ClassLearningScoreReport[];
  semesterReports: ClassLearningScoreReport[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  function download(type: LearningScoreType) {
    downloadLearningScoreReportsExcel(
      type === "semester" ? semesterReports : annualReports,
      type,
    );
    setIsOpen(false);
  }

  const isEmpty = !semesterReports.length;
  return (
    <div className="relative">
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={isEmpty}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Download className="size-4" />
        Xuất Excel điểm
        <ChevronDown className="size-4" />
      </Button>
      {isOpen ? (
        <div
          className="absolute right-0 z-20 mt-1 w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          role="menu"
        >
          <button
            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => download("semester")}
            role="menuitem"
            type="button"
          >
            Điểm học kỳ 1
          </button>
          <button
            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => download("annual")}
            role="menuitem"
            type="button"
          >
            Điểm cả năm
          </button>
        </div>
      ) : null}
    </div>
  );
}
