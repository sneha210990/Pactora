# Downloading the CUAD Dataset

The CUAD dataset is licensed under CC BY 4.0 and is not redistributed in this
repository. Follow these steps to set it up locally before running the benchmark.

## Steps

1. **Download the dataset**

   Go to https://www.atticusprojectai.org/cuad and download the full dataset ZIP
   (labelled something like `CUAD_v1.zip`). Alternatively, download directly from
   the Hugging Face mirror:

   ```
   https://huggingface.co/datasets/theatticusproject/cuad/resolve/main/CUAD_v1.zip
   ```

2. **Extract the archive**

   Extract the ZIP so that the following paths exist relative to the repo root:

   ```
   benchmark/cuad/data/master_clauses.csv
   benchmark/cuad/data/full_contract_txt/
   benchmark/cuad/data/full_contract_pdf/    (optional – the benchmark uses .txt)
   ```

   The `full_contract_txt/` directory should contain 510 plain-text files (one per
   contract). File names match the document names in `master_clauses.csv` with a
   `.txt` extension appended.

3. **Verify the structure**

   ```
   ls benchmark/cuad/data/full_contract_txt/ | wc -l   # should print 510
   head -1 benchmark/cuad/data/master_clauses.csv       # should show column headers
   ```

4. **Check column names**

   Open `master_clauses.csv` and confirm that it contains columns matching the
   names used in `mapping.json`. The exact column names shipped with CUAD v1 are:

   - `Document Name` – the contract identifier (maps to a `.txt` file)
   - `Cap On Liability`
   - `Uncapped Liability`
   - `Indemnification`
   - `IP Ownership Assignment`
   - `License Grant`
   - `Termination For Convenience`
   - `Change Of Control`

   If your version uses different capitalisation or spacing, update the
   `cuad_categories` arrays in `mapping.json` accordingly.

## Directory layout after setup

```
benchmark/cuad/
├── data/
│   ├── master_clauses.csv
│   ├── full_contract_txt/
│   │   ├── OFFICEDEPOT_04-24-2001-EX-10.18-SUPPLY AGREEMENT.txt
│   │   └── ... (509 more)
│   └── full_contract_pdf/   (optional)
├── .cache/                  (created automatically on first run)
├── download.md              (this file)
└── ...
```

## Running the benchmark

After setup, run the smoke test (5 contracts, ≤$1 budget):

```bash
N=5 BUDGET=1 pnpm benchmark:cuad
```

Then review `benchmark/cuad/report.md`. If it looks correct, run the full suite:

```bash
pnpm benchmark:cuad
```

Default: n=50 contracts, $5 budget cap. Override with environment variables:

```bash
N=20 BUDGET=2 pnpm benchmark:cuad
```

The run respects a disk cache: re-running the same sample re-uses cached LLM
responses and costs nothing beyond the initial run.
