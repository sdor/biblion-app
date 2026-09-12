# Reference and Citation Systems Guide

This document describes the standard methods used across scientific, medical, engineering, and academic literature to represent **individual in-text citations**, **groups of citations**, and **reference lists / bibliographies**.

---

## Quick Comparison Overview

| System Type | Common Style Guides / Domains | Single Citation | Group of Citations |
| :--- | :--- | :--- | :--- |
| **Numeric Bracketed** | IEEE, NLM / Vancouver Bracketed, ACM | `[1]` | `[1, 4–6, 9]` |
| **Superscript Numeric** | AMA (11th ed), Nature, The Lancet, BMJ | `...model.¹` | `...models.¹,⁴⁻⁶,⁹` |
| **Author-Date** | APA (7th ed), Harvard, Chicago (Author-Date), MLA | `(Watson & Crick, 1953)` | `(Adams, 2018; Brown & Lee, 2020; Taylor et al., 2023)` |
| **Footnote / Endnote** | Chicago (Notes-Bibliography), Turabian, Law (Bluebook) | `...in primary sources.³` | `...by multiple scholars.⁴` *(Grouped in the note)* |
| **Alphanumeric Key** | BibTeX `alpha`, Discrete Mathematics | `[WC53]` | `[AB21; WC53]` |

---

## 1. Numeric Bracketed System

Widely used in **computer science, electrical engineering, physics, and life sciences**. Citations are assigned integer keys based on their order of first appearance or alphabetical order in the reference list.

### 1.1 In-Text Representation

#### Single Citation
* Standard: `[1]` or `[12]`
* Placement: Typically placed inside sentence punctuation in IEEE (`as described in [1].`), or after the cited clause.

#### Groups of Citations
* **Discrete (Non-consecutive):**
  * Bracket-separated: `[1], [3], [7]` (Strict IEEE style)
  * Comma-separated within single brackets: `[1, 3, 7]` (Vancouver / standard scientific)
* **Consecutive Sequences (Ranges):**
  * Use an en-dash (`–`) or hyphen (`-`) for sequences of 3 or more numbers:
    * `[1–4]` or `[1]–[4]`
    * For 2 consecutive numbers, list both: `[1, 2]` or `[1], [2]`
* **Mixed Sequences (Ranges + Discrete):**
  * `[1–3, 7, 10–12]` or `[1]–[3], [7], [10]–[12]`

### 1.2 Reference List Formatting
```text
[1] J. D. Watson and F. H. C. Crick, "Molecular structure of nucleic acids," Nature, vol. 171, no. 4356, pp. 737–738, 1953.
[2] R. E. Franklin and R. G. Gosling, "Molecular configuration in sodium thymonucleate," Nature, vol. 171, no. 4356, pp. 740–741, 1953.
```

---

## 2. Superscript Numeric System

The standard in **clinical medicine, biomedical sciences (PubMed / MEDLINE journals), chemistry, and multidisciplinary scientific journals (Nature, Science)** to ensure text readability without breaking narrative flow.

### 2.1 In-Text Representation

#### Single Citation
* `...as previously demonstrated.¹`
* `...according to recent clinical guidelines.¹²`

#### Groups of Citations
* **Discrete (Non-consecutive):**
  * Separated by superscript commas with **no space**:
    * `...supported by earlier trials.¹,³,⁷`
* **Consecutive Sequences (Ranges):**
  * Compressed using a superscript hyphen or en-dash (`⁻` or `–`):
    * `...observed in several cohorts.¹⁻⁴`
    * `...across multiple studies.¹–⁵`
* **Mixed Sequences:**
  * `...reported in clinical trials.¹⁻³,⁵,⁸⁻¹⁰`

#### Placement Rules Relative to Punctuation (AMA Style)
* Place superscript numbers **outside** periods and commas:
  * `...as shown in the literature,¹ and verified later.²`
* Place superscript numbers **inside** colons, semicolons, and dashes:
  * `...these three factors were evaluated¹; however...`
* When citing specific page numbers or sub-references:
  * `...as noted in earlier work.¹(p23),²`

### 2.2 Reference List Formatting (NLM / AMA Style)
```text
1. Watson JD, Crick FH. Molecular structure of nucleic acids. Nature. 1953;171(4356):737-738. doi:10.1038/171737a0
2. Franklin RE, Gosling RG. Molecular configuration in sodium thymonucleate. Nature. 1953;171(4356):740-741.
```

---

## 3. Author-Date System

Predominant in **social sciences, psychology, biology, genetics, geology, and economics (APA, Harvard, Chicago Author-Date, MLA)**. Citations directly state author surnames and publication years.

### 3.1 In-Text Representation

#### Single Citation
* **Parenthetical Citation** (at clause/sentence boundaries):
  * *1 Author:* `(Watson, 1953)`
  * *2 Authors:* `(Watson & Crick, 1953)`
  * *3 or more Authors (APA 7th):* `(Franklin et al., 1953)`
  * *Institutional / Collective Author:* `(World Health Organization [WHO], 2024)` → subsequent citations: `(WHO, 2024)`
* **Narrative Citation** (integrated into sentence syntax):
  * `Watson and Crick (1953) discovered the double helix structure...`
  * `Franklin et al. (1953) demonstrated through X-ray diffraction that...`

#### Groups of Citations (Multiple Works in One Parenthesis)
* **Different Authors:**
  * Enclosed in one set of parentheses.
  * Arranged in **alphabetical order** by first author's surname.
  * Separated by **semicolons** (`;`):
    ```text
    (Adams, 2018; Brown & Lee, 2020; Miller et al., 2019; Taylor, 2023)
    ```
* **Same Author(s), Multiple Years:**
  * Do not repeat author names; list years in chronological order separated by commas:
    ```text
    (Smith, 2018, 2021, 2024)
    (Doudna & Charpentier, 2012, 2014)
    ```
* **Same Author(s), Same Year (Disambiguation):**
  * Append lowercase letters (`a`, `b`, `c`) to the publication year:
    ```text
    (Doudna et al., 2020a, 2020b)
    ```
* **Same Surname, Different First Authors:**
  * Include initials to prevent ambiguity:
    ```text
    (E. Smith, 2020; J. Smith, 2019)
    ```

### 3.2 Reference List Formatting (APA 7th Style)
References are sorted **alphabetically by first author's surname**, using hanging indents:
```text
Franklin, R. E., & Gosling, R. G. (1953). Molecular configuration in sodium thymonucleate. Nature, 171(4356), 740–741. https://doi.org/10.1038/171740a0

Watson, J. D., & Crick, F. H. (1953). Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid. Nature, 171(4356), 737–738. https://doi.org/10.1038/171737a0
```

---

## 4. Footnote / Endnote System

Used primarily in the **humanities (history, literature, philosophy, religion) and law (Chicago Notes-Bibliography, Turabian, Bluebook, OSCOLA)**.

### 4.1 In-Text Representation
* An in-text superscript numeral points to a numbered note at the bottom of the page (footnote) or at the end of the article/chapter (endnote):
  ```text
  The initial discovery of the DNA helical structure prompted widespread replication.³
  ```

### 4.2 Note Representation
* **Full Citation (First Mention):**
  `3. James D. Watson and Francis H. C. Crick, "Molecular Structure of Nucleic Acids," Nature 171, no. 4356 (1953): 737–38.`
* **Short Form (Subsequent Mentions):**
  `5. Watson and Crick, "Molecular Structure," 738.`
* **Grouped References in a Single Note:**
  When multiple sources support a single sentence, they are combined in one footnote separated by semicolons:
  `4. See Watson and Crick, "Molecular Structure," 737–38; Rosalind E. Franklin and Raymond G. Gosling, "Molecular Configuration in Sodium Thymonucleate," Nature 171, no. 4356 (1953): 740–41; Maurice H. F. Wilkins et al., Nature 171 (1953): 738–40.`

---

## 5. Summary & Decision Matrix for Implementations

When building citation managers, Word Add-ins, or markdown renderers:

| Requirement / Use Case | Recommended System | Range Compression Rule | Delimiter |
| :--- | :--- | :--- | :--- |
| **Medical / Clinical / PubMed** | Superscript Numeric (AMA / NLM) | 3+ consecutive numbers (`¹⁻³`) | `,` (no space) |
| **Engineering / CS / Math** | Numeric Bracketed (IEEE) | 3+ consecutive numbers (`[1]–[3]`) | `, ` or `], [` |
| **Biology / Life Sciences / Social**| Author-Date (APA / Harvard) | Combine multiple years (`2019, 2021`) | `; ` between authors |
| **Legal / Historical** | Notes-Bibliography (Chicago) | N/A (Grouped in note text) | `; ` in note body |

---

## 6. Algorithmic Rules for Numbered Citation Compression

When collapsing an array of reference indices (e.g. `[1, 2, 3, 5, 7, 8, 9, 10, 14]`):

1. **Sort and deduplicate:** `[1, 2, 3, 5, 7, 8, 9, 10, 14]`
2. **Find continuous runs:**
   * `[1, 2, 3]` → length 3 → range `"1–3"` (or `"1-3"`)
   * `[5]` → length 1 → single `"5"`
   * `[7, 8, 9, 10]` → length 4 → range `"7–10"`
   * `[14]` → length 1 → single `"14"`
3. **Format output:**
   * Bracketed: `"[1–3, 5, 7–10, 14]"`
   * Superscript: `"¹⁻³,⁵,⁷⁻¹⁰,¹⁴"`
