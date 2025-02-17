
import { useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getSkillColor, getSkillResult } from '@/utils/colorCoding';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Candidate, ParsedDocument } from '@/types';

interface CandidateTableProps {
  candidates: Candidate[];
  jobDescriptions: ParsedDocument[];
}

const CandidateTable = ({ candidates, jobDescriptions }: CandidateTableProps) => {
  console.log('Rendering CandidateTable with:', { 
    candidatesCount: candidates.length, 
    jobDescriptionsCount: jobDescriptions.length 
  });

  const getExperienceResult = (candidateExp: string, jdExp: string) => {
    const candidateYears = parseInt(candidateExp) || 0;
    const jdYears = parseInt(jdExp) || 0;
    
    if (Math.abs(candidateYears - jdYears) <= 1) {
      return "Qualified";
    }
    return "Not Qualified";
  };

  const downloadExcel = () => {
    const reportData: any[] = [];
    let slNo = 1;

    // Add header row
    reportData.push({
      'Sl No': 'Sl No',
      'JD Name': 'JD Name',
      'Resume Name': 'Resume Name',
      'Candidate Name': 'Candidate Name',
      'Email': 'Email',
      'Phone Number': 'Phone Number',
      'Candidate Experience': 'Candidate Experience',
      'JD Experience': 'JD Experience',
      'Candidate Skills': 'Candidate Skills',
      'JD Skills': 'JD Skills',
      'Skills Match %': 'Skills Match %',
      'Result Based on Skill': 'Result Based on Skill',
      'Result Based on Experience': 'Result Based on Experience'
    });

    // Create all possible combinations
    jobDescriptions.forEach(jd => {
      candidates.forEach(candidate => {
        const matchForThisJD = candidate.positionMatches.find(
          match => match.title === jd.title
        ) || {
          title: jd.title,
          matchPercentage: 0,
          skills: jd.skills,
          experience: jd.experience
        };

        reportData.push({
          'Sl No': slNo++,
          'JD Name': jd.title,
          'Resume Name': candidate.fileName,
          'Candidate Name': candidate.name,
          'Email': candidate.email,
          'Phone Number': candidate.phone,
          'Candidate Experience': candidate.experience,
          'JD Experience': jd.experience || 'Not specified',
          'Candidate Skills': candidate.skills.join(', '),
          'JD Skills': jd.skills.join(', '),
          'Skills Match %': `${matchForThisJD.matchPercentage}%`,
          'Result Based on Skill': getSkillResult(matchForThisJD.matchPercentage),
          'Result Based on Experience': getExperienceResult(
            candidate.experience,
            jd.experience || '0'
          )
        });
      });
    });

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // Sl No
      { wch: 30 },  // JD Name
      { wch: 30 },  // Resume Name
      { wch: 30 },  // Candidate Name
      { wch: 35 },  // Email
      { wch: 15 },  // Phone Number
      { wch: 20 },  // Candidate Experience
      { wch: 15 },  // JD Experience
      { wch: 50 },  // Candidate Skills
      { wch: 50 },  // JD Skills
      { wch: 15 },  // Skills Match %
      { wch: 20 },  // Result Based on Skill
      { wch: 25 },  // Result Based on Experience
    ];
    worksheet['!cols'] = columnWidths;

    // Add color to Result Based on Skill column
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 11 }); // Column L
      const cell = worksheet[cellAddress];
      if (cell) {
        if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
        const color = getSkillColor(cell.v as any).hex;
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          fill: { fgColor: { rgb: color } }
        };
      }
    }

    // Download the file
    XLSX.writeFile(workbook, `parsed_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
  };

  // Create all possible combinations of JDs and candidates
  const allRows = jobDescriptions.flatMap(jd => 
    candidates.map(candidate => {
      const matchForThisJD = candidate.positionMatches.find(
        match => match.title === jd.title
      ) || {
        title: jd.title,
        matchPercentage: 0,
        skills: jd.skills,
        experience: jd.experience
      };

      return {
        jd,
        candidate,
        match: matchForThisJD
      };
    })
  );

  console.log('Generated rows:', allRows.length);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={downloadExcel} className="mb-4">
          <Download className="w-4 h-4 mr-2" /> Download Excel
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl No</TableHead>
              <TableHead>JD Name</TableHead>
              <TableHead>Resume Name</TableHead>
              <TableHead>Candidate Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Candidate Experience</TableHead>
              <TableHead>JD Experience</TableHead>
              <TableHead>Candidate Skills</TableHead>
              <TableHead>JD Skills</TableHead>
              <TableHead>Skills Match %</TableHead>
              <TableHead>Result Based on Skill</TableHead>
              <TableHead>Result Based on Experience</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allRows.map((row, index) => {
              const skillResult = getSkillResult(row.match.matchPercentage);
              const skillColor = getSkillColor(skillResult);

              return (
                <TableRow key={`${row.jd.title}-${row.candidate.fileName}-${index}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.jd.title}</TableCell>
                  <TableCell>{row.candidate.fileName}</TableCell>
                  <TableCell>{row.candidate.name}</TableCell>
                  <TableCell>{row.candidate.email}</TableCell>
                  <TableCell>{row.candidate.phone}</TableCell>
                  <TableCell>{row.candidate.experience}</TableCell>
                  <TableCell>{row.jd.experience || 'Not specified'}</TableCell>
                  <TableCell>{row.candidate.skills.join(', ')}</TableCell>
                  <TableCell>{row.jd.skills.join(', ')}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${skillColor.tailwind}`}>
                      {row.match.matchPercentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${skillColor.tailwind}`}>
                      {skillResult}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getExperienceResult(
                      row.candidate.experience,
                      row.jd.experience || '0'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CandidateTable;
