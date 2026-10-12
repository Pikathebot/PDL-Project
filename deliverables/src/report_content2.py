# -*- coding: utf-8 -*-
"""Chapters 8-11 and references. ("codefile", title, repo_path, first_line, last_line)
pulls the excerpt straight from the source tree so the report never drifts from the code."""

S = "assets/screens/"

BODY2 = [
    # ------------------------------------------------------------------ 8
    ("chapter", 8, "SAMPLE CODE"),
    ("p", "The following excerpts are taken directly from the project source code. They show the citizen report API, "
          "the AI processing pipeline, the vision detector, the duplicate detection and priority algorithms and the "
          "k-d tree used for responder search."),
    ("codefile", "incidents.py – Citizen report endpoint", "backend/app/api/v1/endpoints/incidents.py", 144, 199),
    ("codefile", "ai_tasks.py – AI processing pipeline", "backend/app/tasks/ai_tasks.py", 101, 152),
    ("codefile", "detector.py – YOLOv8 hazard detector", "ai_pipeline/vision/detector.py", 25, 65),
    ("codefile", "union_find.py – Union-Find with path compression and union by rank", "backend/app/algorithms/union_find.py", 58, 89),
    ("codefile", "priority_queue.py – Weighted priority score", "backend/app/algorithms/priority_queue.py", 15, 31),
    ("codefile", "kd_tree.py – k-d tree construction", "backend/app/algorithms/kd_tree.py", 38, 56),

    # ------------------------------------------------------------------ 9
    ("chapter", 9, "SYSTEM TESTING AND MAINTENANCE"),
    ("p", "Testing is the process of identifying errors and ensuring that the system functions correctly according to "
          "the specified requirements. It verifies that all modules work properly and produce the expected outputs. The project contains 111 automated tests: 64 backend and AI pipeline tests "
          "written with pytest, 45 frontend unit tests written with Vitest and React Testing Library, and 2 "
          "end-to-end browser tests written with Playwright. All of them pass on the final build."),
    ("h3", "TYPES OF TESTS"),
    ("h2", "9.1 UNIT TESTING"),
    ("p", "Unit testing checks individual functions and classes in isolation. The Haversine function is tested with the "
          "known distance between Chennai Central and Egmore stations (about 1.9 km), and the EXIF verifier with the "
          "distance from Chennai Central to Tambaram (about 26 km). The Union-Find structure is tested for correct "
          "merging, path compression and cluster extraction. The duplicate rule is tested with pairs that are close "
          "and similar (merged), close but semantically different (not merged) and pairs that carry only fallback "
          "vectors (never merged). The priority function is tested so that higher severity and more corroboration "
          "always increase the score, and the k-d tree is tested against a brute-force search to confirm that it "
          "returns the true nearest responders. On the frontend, each React component, the API service and the "
          "WebSocket client are tested separately."),
    ("h2", "9.2 FUNCTIONAL TESTING"),
    ("p", "Functional testing verifies that each feature meets its requirement from the user’s point of view. Test "
          "cases cover submitting a report with and without media, rejecting a report without coordinates, returning a "
          "unique tracking ID, retrieving a report by tracking ID, listing and filtering incidents, updating status "
          "through the lifecycle, finding nearest responders and dispatching one. For example, when a citizen submits a "
          "report with a photograph, the API must return HTTP 201 with status REPORTED, the photo must be saved and "
          "linked as a media attachment, and after processing the incident must be VERIFIED with an ai_provenance "
          "record listing the models that ran. Functional testing also verifies the analytics summary, which must "
          "report correct counts by category and status and the average time to dispatch and resolve."),
    ("h2", "9.3 INTEGRATION TESTING"),
    ("p", "Integration testing checks that modules work correctly together. The backend tests run the real FastAPI "
          "application against an in-memory SQLite database, so the API, ORM models, storage service and pipeline "
          "are exercised together without external services. Pipeline tests create incidents, run the full "
          "_process_incident function and check that media routing, LLM extraction, embedding, clustering and "
          "priority scoring combine correctly; for example, two reports one metre apart with matching descriptions "
          "must end up in the same IncidentCluster with a corroboration count of two. The Playwright end-to-end test "
          "starts the real frontend in a browser, fills in the citizen form, submits it and confirms that the request "
          "reaches the API with the expected fields."),
    ("h2", "9.4 BLACK BOX TESTING"),
    ("p", "Black box testing examines the system only through its inputs and outputs, without knowledge of the "
          "internal code. The citizen form was tested with valid reports, missing descriptions, missing or invalid "
          "coordinates, very long text, large images, videos and voice notes, and the dispatcher dashboard was tested by "
          "logging in with correct and incorrect credentials and attempting to access protected pages without a token. "
          "The full demonstration dataset of 18 incidents across Chennai, including three deliberate duplicate groups at "
          "T. Nagar, Kathipara junction and Velachery, was pushed through the real pipeline with the local language "
          "model; all three groups were merged into clusters and every incident reached the VERIFIED state with "
          "realistic severities and summaries."),
    ("h2", "9.5 WHITE BOX TESTING"),
    ("p", "White box testing is based on knowledge of the internal logic, and aims to exercise every important branch. "
          "Tests were written for each branch of the media router (image, video, audio), for the fallback paths taken "
          "when YOLO, Whisper, the language model or the embedding model are unavailable, for the retry without "
          "response_format when the language model server rejects a JSON schema, and for parsing model output that "
          "contains code fences or extra text. The authentication dependency is tested so that requests without a "
          "token, with an expired token or with a non-dispatcher role are rejected with the correct status codes."),

    # ------------------------------------------------------------------ 10
    ("chapter", 10, "SCREENSHOTS"),
    ("fig", S + "01_citizen_form.png", "10.1", "Citizen Report Form", 6.0),
    ("fig", S + "02_citizen_form_filled.png", "10.2", "Report with Photo Evidence and GPS", 6.0),
    ("fig", S + "03b_track_status.png", "10.3", "Citizen Track Status", 6.0),
    ("fig", S + "04_login.png", "10.4", "Dispatcher Login", 6.0),
    ("fig", S + "05_dashboard.png", "10.5", "Dispatcher Dashboard", 6.0),
    ("fig", S + "06_incident_live_report.png", "10.6", "AI Incident Analysis", 6.0),
    ("fig", S + "07b_incident_dispatch.png", "10.7", "Nearest Responder Dispatch", 6.0),
    ("fig", S + "08_analytics.png", "10.8", "Analytics Dashboard", 6.0),

    # ------------------------------------------------------------------ 11
    ("chapter", 11, "CONCLUSION & FUTURE ENHANCEMENT"),
    ("h2", "11.1 CONCLUSION"),
    ("p", "The Sentinel system demonstrates that artificial intelligence can turn citizen reports from a stream of "
          "unstructured, duplicated phone calls into a verified and prioritised incident queue. A citizen in Chennai can "
          "report a hazard in under a minute with a photograph, video or voice note and an exact GPS position, and "
          "receives a tracking ID immediately. Behind the scenes, YOLOv8 analyses images and video keyframes, EXIF "
          "metadata is checked against the reported location, Whisper transcribes voice notes, and a locally hosted "
          "language model extracts a structured summary and severity. Sentence embeddings with a Union-Find algorithm "
          "merged all three duplicate groups in the Chennai demonstration dataset into single clusters, and a weighted "
          "priority score placed the most serious incidents, such as the bus accident at Kathipara junction and the "
          "transformer fire at T. Nagar, at the top of the queue."),
    ("p", "For dispatchers, the live map, real-time feed and k-d tree recommendation of the nearest available responder "
          "reduce the time spent understanding an incident and deciding whom to send. Every stage of the lifecycle is "
          "time-stamped, so the average time to dispatch and to resolve can be measured and improved. The system was "
          "designed to be honest about its own limits: whenever a model is not available, it records that fact "
          "instead of inventing results. Built entirely from open-source software and running on a single laptop with "
          "a consumer GPU, Sentinel is an affordable and practical step towards faster, smarter emergency response."),
    ("h2", "11.2 FUTURE ENHANCEMENT"),
    ("bul", ["Integration with Emergency Services – Connect Sentinel with the Emergency Response Support System (112) "
             "and state police, fire and ambulance control rooms so that verified incidents flow directly into their "
             "dispatch systems.",
             "Regional Language Support – Add Tamil and other Indian languages to the interface and use multilingual "
             "speech recognition and language models so that every citizen can report in their own language.",
             "Responder Mobile App – Provide responders with a mobile app that shares live location, receives "
             "assignments with navigation, and updates incident status from the field.",
             "Fine-tuned Hazard Detection – Train the vision model on Indian incident images (fires, floods, road "
             "accidents, fallen wires) so that hazards themselves, not just objects, are detected.",
             "Predictive Analytics – Use historical incident data to forecast hotspots, such as flood-prone roads "
             "during the monsoon, and pre-position responders.",
             "Spam and Abuse Protection – Enable bot protection, rate limiting and reputation scoring to filter false "
             "or malicious reports at scale.",
             "Offline Reporting – Allow the progressive web app to queue reports when the network is unavailable and "
             "send them automatically when connectivity returns, including SMS fallback.",
             "Scalable Cloud Deployment – Deploy on Kubernetes with multiple Celery workers and GPU inference servers "
             "to support city-wide and state-wide use."]),
]

REFERENCES = [
    "Sakaki, T., Okazaki, M., & Matsuo, Y. (2010). Earthquake Shakes Twitter Users: Real-time Event Detection by "
    "Social Sensors. Proceedings of the 19th International Conference on World Wide Web (WWW), 851–860.",
    "Imran, M., Castillo, C., Diaz, F., & Vieweg, S. (2015). Processing Social Media Messages in Mass Emergency: A "
    "Survey. ACM Computing Surveys, 47(4), Article 67.",
    "Goodchild, M. F., & Glennon, J. A. (2010). Crowdsourcing Geographic Information for Disaster Response: A Research "
    "Frontier. International Journal of Digital Earth, 3(3), 231–241.",
    "Alam, F., Ofli, F., & Imran, M. (2018). CrisisMMD: Multimodal Twitter Datasets from Natural Disasters. "
    "Proceedings of the International AAAI Conference on Web and Social Media (ICWSM).",
    "Ofli, F., Alam, F., & Imran, M. (2020). Analysis of Social Media Data using Multimodal Deep Learning for Disaster "
    "Response. Proceedings of the 17th ISCRAM Conference.",
    "Redmon, J., Divvala, S., Girshick, R., & Farhadi, A. (2016). You Only Look Once: Unified, Real-Time Object "
    "Detection. IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 779–788.",
    "Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). Robust Speech Recognition via "
    "Large-Scale Weak Supervision. Proceedings of the 40th International Conference on Machine Learning (ICML).",
    "Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. Proceedings of "
    "EMNLP-IJCNLP 2019, 3982–3992.",
    "Bentley, J. L. (1975). Multidimensional Binary Search Trees Used for Associative Searching. Communications of the "
    "ACM, 18(9), 509–517.",
    "Aringhieri, R., Bruni, M. E., Khodaparasti, S., & van Essen, J. T. (2017). Emergency Medical Services and Beyond: "
    "Addressing New Challenges through a Wide Literature Review. Computers & Operations Research, 78, 349–368.",
    "Tarjan, R. E. (1975). Efficiency of a Good But Not Linear Set Union Algorithm. Journal of the ACM, 22(2), 215–225.",
    "Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8. https://github.com/ultralytics/ultralytics",
    "Gerganov, G. et al. llama.cpp: LLM Inference in C/C++. https://github.com/ggml-org/llama.cpp",
    "Ministry of Electronics and Information Technology, Government of India. (2023). The Digital Personal Data "
    "Protection Act, 2023.",
]
