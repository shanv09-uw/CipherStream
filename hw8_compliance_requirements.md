# Compliance Requirements for CipherStream

As an End-to-End Encrypted (E2EE) messaging application, CipherStream operates at the intersection of stringent global data privacy laws and national security intercept mandates. The following are the primary compliance frameworks our Product must navigate:

## 1\. General Data Protection Regulation (GDPR) - European Union

The GDPR mandates strict privacy controls for any application handling EU citizen data, regardless of where the company is headquartered.

### Key Requirements for CipherStream:

* **Data Minimization (Article 5):** Applications must only collect the absolute minimum data necessary for the service. Because CipherStream utilizes E2EE and only stores encrypted binary payloads and public keys, it natively aligns well with this requirement.
* **Right to Erasure / "Right to be Forgotten" (Article 17):** Users must have the explicit ability to request the permanent deletion of their personal data without undue delay.
* **Privacy by Design (Article 25):** Data protection must be integrated into the core architecture of the app, not bolted on as an afterthought. E2EE is the ultimate expression of this requirement.

**Sources:**

* GDPR Official Text (Art. 5, 17, 25): https://gdpr-info.eu/

## 2\. Communications Assistance for Law Enforcement Act (CALEA) - United States

CALEA requires telecommunications carriers and manufacturers of telecommunications equipment to design their equipment, facilities, and services to ensure that they have the necessary surveillance capabilities to comply with legal requests for information.

### Key Requirements for CipherStream:

* **Lawful Intercept:** Traditional messaging providers must have the ability to wiretap communications when presented with a warrant.
* **The E2EE Exemption:** Crucially, under current CALEA interpretations, if a provider does not retain the decryption keys (which CipherStream does not, as they are generated and held on the client's device), the provider cannot be legally compelled to decrypt the data. They are only required to hand over what they have (the encrypted ciphertext and metadata).

**Sources:**

* FCC CALEA Guide: https://www.fcc.gov/calea
* EFF on CALEA and Encryption: https://www.eff.org/issues/calea

## 3\. Online Safety Acts (UK / EU)

Recent legislative efforts (e.g., the UK Online Safety Act) attempt to mandate "client-side scanning" or backdoor access to detect illegal material (like CSAM) before it gets encrypted.

### Key Requirements:

* These bills often create conflicting requirements with GDPR's Privacy by Design, forcing E2EE providers to either break their encryption (creating a backdoor) or face severe penalties.

**Sources:**

* UK Online Safety Act Overview: https://www.gov.uk/guidance/a-guide-to-the-online-safety-bill

